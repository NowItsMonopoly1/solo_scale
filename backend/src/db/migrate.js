import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;

async function runMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Get all migration files
    const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), 'migrations');
    const migrationFiles = [
      '001_add_conversation_lifecycle.sql',
      '002_document_extractions.sql',
      '004_add_performance_indexes.sql',
      '005_add_messaging_and_persistence.sql',
      '006_add_rbac_and_succession.sql'
    ];

    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const sql = readFileSync(join(migrationsDir, file), 'utf8');
      await client.query(sql);
      console.log(`✅ Migration ${file} completed`);
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();