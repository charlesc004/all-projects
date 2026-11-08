import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const databaseDir = resolve(root, '.postgres');
const port = Number(process.env.LOCAL_POSTGRES_PORT || 5432);
const postgres = new EmbeddedPostgres({
  databaseDir,
  user: 'nexus',
  password: 'nexus_local_only',
  port,
  persistent: true,
  authMethod: 'scram-sha-256',
  postgresFlags: ['-h', '127.0.0.1'],
  onLog: () => {},
  onError: (error) => console.error(String(error)),
});

try {
  if (!existsSync(resolve(databaseDir, 'PG_VERSION'))) await postgres.initialise();
  await postgres.start();
  const client = postgres.getPgClient();
  await client.connect();
  for (const name of ['nexus', 'nexus_test']) {
    const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (!existing.rowCount) await client.query(`CREATE DATABASE "${name}"`);
  }
  await client.end();
  console.log(`PostgreSQL ready at 127.0.0.1:${port}. Databases: nexus, nexus_test.`);
  console.log(
    'Local development credentials only. Press Ctrl+C to stop. Data persists in .postgres/.',
  );
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await postgres.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  setInterval(() => {}, 60_000);
} catch (error) {
  console.error(
    'Could not start local PostgreSQL:',
    error instanceof Error ? error.message : error,
  );
  console.error('If port 5432 is occupied, use your existing database or stop its service first.');
  process.exit(1);
}
