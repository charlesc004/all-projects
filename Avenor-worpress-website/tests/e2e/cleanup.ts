import { execFileSync } from 'node:child_process';

export default async function cleanup() {
  // Only the project's own local database is touched by this tool.
  execFileSync(process.execPath, ['tools/reset-preview-limits.mjs', '--cleanup'], { stdio: 'inherit' });
}
