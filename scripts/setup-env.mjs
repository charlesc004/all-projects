import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rootEnv = resolve(root, '.env');
if (!existsSync(rootEnv)) {
  const secret = randomBytes(48).toString('hex');
  const template = readFileSync(resolve(root, '.env.example'), 'utf8');
  writeFileSync(rootEnv, template.replaceAll('replace-with-at-least-32-random-characters', secret));
  console.log('Created .env with a unique local signing secret.');
} else console.log('Keeping existing .env.');
for (const file of ['apps/api/.env']) {
  const target = resolve(root, file);
  mkdirSync(dirname(target), { recursive: true });
  if (!existsSync(target)) {
    writeFileSync(target, readFileSync(rootEnv));
    console.log(`Created ${file}.`);
  } else console.log(`Keeping existing ${file}.`);
}
const webEnv = resolve(root, 'apps/web/.env.local');
if (!existsSync(webEnv)) {
  mkdirSync(dirname(webEnv), { recursive: true });
  writeFileSync(webEnv, 'API_URL=http://127.0.0.1:4000\n');
  console.log('Created apps/web/.env.local.');
}
