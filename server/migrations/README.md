# Database Migrations Project

## Usage

To create new migration files run:

```
node server/migrations/index.js new -n my_file
```

To apply migrations run:

```
./migrations.sh migrate
```

To rollback the last migrations run:

```
./migrations.sh rollback
```
