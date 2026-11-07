import { config } from 'dotenv';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
config({ path: resolve(root, '.env'), quiet: true });
const databaseUrl = process.env.DATABASE_URL_TEST;
if (!databaseUrl) throw new Error('DATABASE_URL_TEST must point to a dedicated test database.');
const parsed = new URL(databaseUrl);
if (!parsed.pathname.endsWith('_test') && !parsed.searchParams.get('schema')?.startsWith('test_')) {
  throw new Error(
    'Integration tests require a database ending in _test or a schema starting with test_.',
  );
}
const require = createRequire(resolve(root, 'apps/api/package.json'));
const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  NODE_ENV: 'test',
  REDIS_URL: '',
  JWT_ACCESS_SECRET: 'integration-tests-only-signing-secret-at-least-32-characters',
};
const run = (args) => {
  const result = spawnSync(process.execPath, args, {
    cwd: resolve(root, 'apps/api'),
    env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};
run([require.resolve('prisma/build/index.js'), 'migrate', 'deploy']);
run([require.resolve('jest/bin/jest'), '--runInBand', '--config', 'jest.integration.config.cjs']);
