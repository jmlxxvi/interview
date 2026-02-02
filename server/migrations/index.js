#!/usr/bin/env node

import { program } from 'commander'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync
} from 'fs'
import path, { join } from 'path'
import { Client } from 'pg'

const MIGRATIONS_SCHEMA = 'migrations'
const MIGRATIONS_TABLE = 'migrations'
const MAX_LOG_LINE_LENGTH = 90

// Load environment variables from .env file
function loadEnv () {
  try {
    const envFilePath = path.resolve(import.meta.dirname, '../../', '.env')
    const envFile = readFileSync(envFilePath, 'utf8')
    const envVars = {}

    envFile.split('\n').forEach((line) => {
      const [key, value] = line
        .split('=')
        .map((item) => item.trim().replace(/^"|"$/g, ''))
      if (key && value) {
        envVars[key] = value
      }
    })

    return envVars
  } catch (err) {
    console.error('Error loading .env file:', err.message)
    return {}
  }
}

const envVars = loadEnv()

function getDbUrl () {
  return envVars.DB_URL
}

/**
 * @function splitSqlIntoStatements
 * @description Splits a SQL string into individual executable statements.
 * Handles strings, dollar-quoted strings, and comments.
 *
 * @param {string} sql The raw SQL content.
 *
 * @returns {string[]} Array of executable SQL statements.
 */
function splitSqlIntoStatements (sql) {
  const statements = []
  let current = ''
  let state = 'NORMAL'
  let dollarTag = ''
  let i = 0

  while (i < sql.length) {
    const char = sql[i]
    const nextChar = i + 1 < sql.length ? sql[i + 1] : ''

    if (state === 'NORMAL') {
      if (char === "'") {
        state = 'STRING'
        current += char
      } else if (char === '$') {
        const match = sql.slice(i).match(/^(\$[a-zA-Z0-9_]*\$)/)
        if (match) {
          state = 'DOLLAR'
          dollarTag = match[1]
          current += dollarTag
          i += dollarTag.length - 1
        } else {
          current += char
        }
      } else if (char === '-' && nextChar === '-') {
        state = 'LINE_COMMENT'
        current += char
      } else if (char === '/' && nextChar === '*') {
        state = 'BLOCK_COMMENT'
        current += char
      } else if (char === ';') {
        statements.push(current.trim())
        current = ''
      } else {
        current += char
      }
    } else if (state === 'STRING') {
      current += char
      if (char === "'") {
        if (nextChar === "'") {
          current += "'"
          i++
        } else {
          state = 'NORMAL'
        }
      }
    } else if (state === 'DOLLAR') {
      if (char === '$' && sql.slice(i).startsWith(dollarTag)) {
        state = 'NORMAL'
        current += dollarTag
        i += dollarTag.length - 1
      } else {
        current += char
      }
    } else if (state === 'LINE_COMMENT') {
      current += char
      if (char === '\n') {
        state = 'NORMAL'
      }
    } else if (state === 'BLOCK_COMMENT') {
      current += char
      if (char === '*' && nextChar === '/') {
        state = 'NORMAL'
        current += '/'
        i++
      }
    }
    i++
  }

  if (current.trim()) {
    statements.push(current.trim())
  }

  return statements.filter(s => s.length > 0)
}

class MigrationRunner {
  constructor () {
    const dbUrl = getDbUrl()
    console.log('dbUrl: ', dbUrl)
    this.client = new Client(dbUrl)
  }

  async run (direction, migrationsDir) {
    try {
      await this.client.connect()

      await this._ensureMigrationsTable()

      const sqlFilesDir = path.resolve(migrationsDir, 'sql')

      const migrationFiles = readdirSync(sqlFilesDir)
        .filter((file) => file.endsWith('.sql'))
        .sort()

      if (migrationFiles.length === 0) {
        console.log(`No migration files found in the specified directory: ${migrationsDir}`)
        return
      }

      if (direction === 'up') {
        await this._runUpMigrations(sqlFilesDir, migrationFiles)
      } else if (direction === 'down') {
        await this._runDownLastMigration(sqlFilesDir, migrationFiles)
      } else if (direction === 'reset') {
        await this._runDownMigrations(sqlFilesDir, migrationFiles)
      } else {
        console.error('Invalid direction. Use "up", "down", or "reset".')
        process.exit(1)
      }
    } finally {
      await this.client.end()
    }
  }

  async _ensureMigrationsTable () {
    await this.client.query(`
            CREATE SCHEMA IF NOT EXISTS ${MIGRATIONS_SCHEMA};
        `)

    await this.client.query(`
            CREATE TABLE IF NOT EXISTS ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `)
  }

  async _runUpMigrations (sqlFilesDir, migrationFiles) {
    const executedMigrations = await this._getExecutedMigrations()

    for (const file of migrationFiles) {
      if (executedMigrations.includes(file)) continue

      const filePath = join(sqlFilesDir, file)
      const { upStatements } = this._parseMigrationFile(
        readFileSync(filePath, 'utf8')
      )

      if (upStatements.length === 0) {
        console.log(`No UP migrations in ${file}`)
        continue
      }

      await this.client.query('BEGIN')
      try {
        console.log(`\nRunning UP: ${file}`)

        for (const statement of upStatements) {
          if (!statement.trim()) continue
          console.log(`Executing: ${statement.split('\n')[0].substring(0, MAX_LOG_LINE_LENGTH)}...`)
          await this.client.query(statement)
        }

        await this.client.query(`INSERT INTO ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} (name) VALUES ($1)`, [file])

        await this.client.query('COMMIT')
        console.log(`🟢 ${file} applied successfully`)
      } catch (err) {
        await this.client.query('ROLLBACK')
        console.error(`🔴 ${file} failed: ${err.message}`)
        throw err
      }
    }
  }

  async _runDownMigrations (sqlFilesDir, migrationFiles) {
    const executedMigrations = (await this._getExecutedMigrations()).reverse()

    for (const file of executedMigrations) {
      if (!migrationFiles.includes(file)) continue

      const filePath = join(sqlFilesDir, file)
      const { downStatements } = this._parseMigrationFile(
        readFileSync(filePath, 'utf8')
      )

      if (downStatements.length === 0) {
        console.log(`No DOWN migrations in ${file}`)
        continue
      }

      await this.client.query('BEGIN')
      try {
        console.log(`\nRunning DOWN: ${file}`)

        for (const statement of downStatements) {
          if (!statement.trim()) continue
          console.log(`Executing: ${statement.split('\n')[0].substring(0, MAX_LOG_LINE_LENGTH)}...`)
          await this.client.query(statement)
        }

        await this.client.query(`DELETE FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} WHERE name = $1`, [file])

        await this.client.query('COMMIT')
        console.log(`🟢 ${file} reverted successfully`)
      } catch (err) {
        await this.client.query('ROLLBACK')
        console.error(`🔴 ${file} revert failed: ${err.message}`)
        throw err
      }
    }
  }

  async _runDownLastMigration (sqlFilesDir, migrationFiles) {
    const executedMigrations = (await this._getExecutedMigrations()).reverse()

    if (executedMigrations.length === 0) {
      console.log('No migrations to revert')
      return
    }

    const file = executedMigrations[0]

    const filePath = join(sqlFilesDir, file)
    const { downStatements } = this._parseMigrationFile(
      readFileSync(filePath, 'utf8')
    )

    if (downStatements.length === 0) {
      console.log(`No DOWN migrations in ${file}`)
      return
    }

    await this.client.query('BEGIN')

    try {
      console.log(`\nRunning DOWN: ${file}`)

      for (const statement of downStatements) {
        if (!statement.trim()) continue
        console.log(`Executing: ${statement.split('\n')[0].substring(0, MAX_LOG_LINE_LENGTH)}...`)
        await this.client.query(statement)
      }

      await this.client.query(`DELETE FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} WHERE name = $1`, [file])

      await this.client.query('COMMIT')
      console.log(`🟢 ${file} reverted successfully`)
    } catch (err) {
      await this.client.query('ROLLBACK')
      console.error(`🔴 ${file} revert failed: ${err.message}`)
      throw err
    }
  }

  async _getExecutedMigrations () {
    const result = await this.client.query(`SELECT name FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} ORDER BY executed_at`)
    return result.rows.map((row) => row.name)
  }

  _parseMigrationFile (content) {
    const upStatements = []
    const downStatements = []
    let currentSection = null
    let currentStatements = []

    for (const line of content.split('\n')) {
      if (line.includes('-- migrate:up') || line.includes('--migrate:up')) {
        if (currentSection) {
          (currentSection === 'up' ? upStatements : downStatements).push(
            currentStatements.join('\n')
          )
        }
        currentSection = 'up'
        currentStatements = []
        continue
      }

      if (line.includes('-- migrate:down') || line.includes('--migrate:down')) {
        if (currentSection) {
          (currentSection === 'up' ? upStatements : downStatements).push(
            currentStatements.join('\n')
          )
        }
        currentSection = 'down'
        currentStatements = []
        continue
      }

      if (line.trim().startsWith('--')) {
        continue
      }

      if (currentSection) currentStatements.push(line)
    }

    if (currentSection) {
      (currentSection === 'up' ? upStatements : downStatements).push(
        currentStatements.join('\n')
      )
    }

    const processStatements = (arr) => splitSqlIntoStatements(arr.join('\n'))

    return {
      upStatements: processStatements(upStatements),
      downStatements: processStatements(downStatements)
    }
  }
}

// CLI Setup
program.name('migrate').description('Database migration tool').version('1.0.0')

program
  .command('up')
  .description('Run pending migrations')
  .requiredOption('-d, --dir <path>', `Migrations directory, default is "${import.meta.dirname}"`, import.meta.dirname)
  .action(async (cmd) => {
    try {
      const runner = new MigrationRunner()
      await runner.run('up', cmd.dir)
      console.log('\nAll migrations applied successfully')
      process.exit(0)
    } catch (err) {
      console.error('\nMigration failed:', err.message)
      process.exit(1)
    }
  })

program
  .command('down')
  .description('Revert the last migration')
  .requiredOption('-d, --dir <path>', `Migrations directory, default is "${import.meta.dirname}"`, import.meta.dirname)
  .action(async (cmd) => {
    try {
      const runner = new MigrationRunner()
      await runner.run('down', cmd.dir)
      console.log('\nMigration reverted successfully')
      process.exit(0)
    } catch (err) {
      console.error('\nMigration revert failed:', err.message)
      process.exit(1)
    }
  })

program
  .command('reset')
  .description('Revert all the migrations')
  .requiredOption('-d, --dir <path>', `Migrations directory, default is "${import.meta.dirname + '/migrations'}"`, import.meta.dirname + '/migrations')
  .action(async (cmd) => {
    try {
      const runner = new MigrationRunner()
      await runner.run('reset', cmd.dir)
      console.log('\nAll migrations reverted successfully')
      process.exit(0)
    } catch (err) {
      console.error('\nMigrations reset failed:', err.message)
      process.exit(1)
    }
  })

program
  .command('status')
  .description('Show migration status')
  .action(async () => {
    try {
      const client = new Client(getDbUrl())
      await client.connect()

      // Check if migrations table exists
      const res = await client.query(`SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE 1=1
        AND table_schema = $1
        AND table_name = $2);`,
      [MIGRATIONS_SCHEMA, MIGRATIONS_TABLE]
      )

      if (!res.rows[0].exists) {
        console.log('No migrations have been run yet')
        await client.end()
        return
      }

      // Get executed migrations
      const executed = await client.query(`SELECT name, executed_at FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} ORDER BY executed_at`)
      console.log('\nExecuted migrations:')
      executed.rows.forEach((row) => {
        console.log(`- ${row.name} (${row.executed_at.toISOString()})`)
      })

      await client.end()
      process.exit(0)
    } catch (err) {
      console.error('Error checking migration status:', err.message)
      process.exit(1)
    }
  })

program
  .command('new')
  .description('Create a new migration file')
  .requiredOption('-n, --name <name>', 'Name of the migration')
  .action(async (cmd) => {
    try {
      const dateTimeString = new Date()
        .toISOString()
        .replace(/[-:T]/g, '')
        .split('.')[0]
      const fileName = `${dateTimeString}_${cmd.name}.sql`
      const filePath = path.join(import.meta.dirname, 'sql', fileName)
      const content = '-- migrate:up\n\n-- TODO: Add your migration SQL here\n\n-- migrate:down\n\n-- TODO: Add your rollback SQL here\n'

      // const dirPath = path.join(import.meta.dirname, 'migrations');
      const dirPath = import.meta.dirname

      if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true })
      }

      writeFileSync(filePath, content)

      console.log(`Migration file created: ${filePath}`)

      process.exit(0)
    } catch (err) {
      console.error('Error checking migration status:', err.message)
      process.exit(1)
    }
  })

program.parse(process.argv)
