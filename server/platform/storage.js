import fs from 'node:fs/promises'

import config from '../config.js'
import log from './log.js'

export async function storageCreateDirectories () {
  const storagePath = config.storage.base_dir

  if (!storagePath) {
    log.error('Storage path is not defined in configuration.', 'storage')
    return
  }

  const pathsToCreate = [
    storagePath,
    `${storagePath}/uploads`
  ]

  try {
    for (const path of pathsToCreate) {
      await fs.mkdir(path, { recursive: true })
      log.info(`Created directory: ${path}`, 'storage')
    }
  } catch (error) {
    log.error('Error creating storage directories:' + error, 'storage')
  }
}
