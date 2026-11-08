import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const assets = 'web/wp-content/themes/avenor/assets';
const modules = JSON.parse(readFileSync(`${assets}/modules.json`, 'utf8'));
const styles = JSON.parse(readFileSync(`${assets}/css/manifest.json`, 'utf8'));
const failures = [];
function files(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? files(join(root, entry.name)) : [join(root, entry.name)]);
}
const registered = new Set();
for (const [id, module] of Object.entries(modules)) {
  const file = `${assets}/${module.file}`;
  if (!existsSync(file)) { failures.push(`Missing module ${id}`); continue; }
  registered.add(module.file);
  const imports = [...readFileSync(file, 'utf8').matchAll(/from\s+['"](@avenor\/[^'"]+)['"]/g)].map(match => match[1]).sort();
  if (JSON.stringify(imports) !== JSON.stringify([...module.dependencies].sort())) {
    failures.push(`Import-map dependencies do not match ${id}`);
  }
}
const reached = new Set();
function visit(id, ancestors = []) {
  if (!modules[id]) { failures.push(`Unknown dependency ${id}`); return; }
  if (ancestors.includes(id)) { failures.push(`Circular module dependency ${id}`); return; }
  if (reached.has(id)) return;
  reached.add(id);
  modules[id].dependencies.forEach(dependency => visit(dependency, [...ancestors, id]));
}
Object.entries(modules).filter(([, value]) => value.entry).forEach(([id]) => visit(id));
Object.keys(modules).filter(id => !reached.has(id)).forEach(id => failures.push(`Unused module ${id}`));
files(`${assets}/js`).forEach(file => {
  if (!registered.has(relative(assets, file).replaceAll('\\', '/'))) failures.push(`Unregistered script ${file}`);
});
const css = files(`${assets}/css`).filter(file => file.endsWith('.css')).map(file => relative(`${assets}/css`, file).replaceAll('\\', '/')).sort();
if (new Set(styles.frontend).size !== styles.frontend.length || JSON.stringify(css) !== JSON.stringify([...styles.frontend].sort())) {
  failures.push('CSS manifest contains missing, duplicate or unregistered components');
}
let checked = 0;
for (const file of ['web/wp-content/themes/avenor', 'web/wp-content/plugins/avenor-core', 'tools'].flatMap(files)) {
  if (!/\.(php|js|mjs|css|html)$/.test(file) || /[\\/]build[\\/]|[\\/]tests[\\/]/.test(file)) continue;
  checked++;
  const source = readFileSync(file, 'utf8');
  if (statSync(file).size > 10000 || source.split('\n').length > 240) failures.push(`Source component exceeds 10KB/240 lines: ${file}`);
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Architecture: ${checked} source files, ${registered.size} versioned modules, ${css.length} CSS components; boundaries and import graph valid.`);
}
