import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
// The official SQLite integration bundled by Playground; no extra test driver dependency.
execFileSync(process.platform === 'win32' ? 'tar.exe' : 'unzip', process.platform === 'win32'
  ? ['-xf', resolve('node_modules/@wp-playground/cli/sqlite-database-integration.zip'), '-C', resolve('.runtime')]
  : ['-o', 'node_modules/@wp-playground/cli/sqlite-database-integration.zip', '-d', '.runtime'], { stdio: 'inherit' });
