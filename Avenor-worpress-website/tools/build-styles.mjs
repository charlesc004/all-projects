import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';
import cssnano from 'cssnano';

const root = resolve('web/wp-content/themes/avenor/assets');
const manifest = JSON.parse(readFileSync(`${root}/css/manifest.json`, 'utf8'));
mkdirSync(`${root}/build`, { recursive: true });
for (const [target, files] of Object.entries(manifest)) {
  const source = files.map(file => readFileSync(`${root}/css/${file}`, 'utf8')).join('\n');
  const result = await postcss([cssnano({ preset: 'default' })]).process(source, { from: undefined });
  writeFileSync(`${root}/build/${target === 'frontend' ? 'site' : target}.css`, result.css);
  console.log(`${target} CSS: ${files.length} source components → ${Buffer.byteLength(result.css)} bytes`);
}
