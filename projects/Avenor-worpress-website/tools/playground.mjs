import { runCLI } from '@wp-playground/cli';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

// Full WordPress/PHP preview. SQLite is a portable local alternative to Docker/MySQL.
mkdirSync('.runtime/site', { recursive: true });
const instance = await runCLI({
  command: 'server', php: '8.3', wp: 'latest', port: Number(process.env.PORT || 9400), workers: 2,
  wordpressInstallMode: 'install-from-existing-files-if-needed',
  'mount-before-install': [{ hostPath: resolve('.runtime/site'), vfsPath: '/wordpress' }],
  mount: [
    { hostPath: resolve('web/wp-content/themes/avenor'), vfsPath: '/wordpress/wp-content/themes/avenor' },
    { hostPath: resolve('web/wp-content/plugins/avenor-core'), vfsPath: '/wordpress/wp-content/plugins/avenor-core' },
    { hostPath: resolve('tools'), vfsPath: '/wordpress/avenor-tools' },
  ],
  blueprint: { steps: [
    { step: 'activatePlugin', pluginPath: '/wordpress/wp-content/plugins/avenor-core/avenor-core.php' },
    { step: 'activateTheme', themeFolderName: 'avenor' },
    { step: 'runPHP', code: '<?php require "/wordpress/wp-load.php"; require "/wordpress/avenor-tools/seed.php";' },
  ] },
});
// Playground may serve an initial bootstrap request before plugin routes appear.
// Check actual application readiness before advertising the preview as ready.
let applicationReady = false;
for (let attempt = 0; attempt < 3; attempt++) {
  const response = await fetch(new URL('/wp-json/', instance.serverUrl));
  const index = await response.json();
  if (response.ok && index.routes?.['/avenor/v1/contact']) {
    applicationReady = true;
    break;
  }
}
if (!applicationReady) {
  await instance[Symbol.asyncDispose]();
  throw new Error('AVENOR REST routes did not become available during preview startup.');
}
console.log(`AVENOR ready: ${instance.serverUrl}`);
console.log('Local Playground administrator: admin / password (local preview only).');
process.on('SIGINT', async () => { await instance[Symbol.asyncDispose](); process.exit(0); });
