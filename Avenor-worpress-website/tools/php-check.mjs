import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory()
    ? files(join(dir, entry.name)) : entry.name.endsWith('.php') ? [join(dir, entry.name)] : []);
}
const paths = ['web/wp-content/themes/avenor', 'web/wp-content/plugins/avenor-core', 'tools', 'tests/php'].flatMap(files);
let failed = false;
for (const path of paths) {
  const result = spawnSync(process.env.PHP_BINARY || 'php', ['-l', path], { encoding: 'utf8' });
  if (result.status !== 0) { failed = true; console.error(result.stderr || result.error || result.stdout); }
}
console.log(`PHP syntax: ${paths.length} files checked${failed ? ', failures found' : ', all valid'}.`);
process.exitCode = failed ? 1 : 0;
