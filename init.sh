touch prisma/dev.db
cat prisma/migrations/20230311033652_init/migration.sql | sqlite3 prisma/dev.db