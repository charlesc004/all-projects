import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { runCLI } from '@wp-playground/cli';

// Reset only this project's local Playground test allowance. Never call a public API
// or disable rate limiting in the product. External/MySQL test targets are untouched.
if (!process.env.BASE_URL && existsSync('.runtime/site/wp-load.php')) {
  const cleanup = process.argv.includes('--cleanup') ? `
    foreach (array('browser@example.test', 'native@example.test', 'workflow-verify@example.test') as $email) {
      foreach (get_posts(array('post_type'=>'avenor_inquiry','post_status'=>array('private','trash'),'posts_per_page'=>100,'meta_key'=>'_avenor_email','meta_value'=>$email)) as $record) {
        wp_delete_post($record->ID, true);
      }
    }
  ` : '';
  await runCLI({
    command: 'run-blueprint', php: '8.3', workers: 1, verbosity: 'quiet',
    wordpressInstallMode: 'do-not-attempt-installing',
    'mount-before-install': [{ hostPath: resolve('.runtime/site'), vfsPath: '/wordpress' }],
    mount: [
      { hostPath: resolve('web/wp-content/themes/avenor'), vfsPath: '/wordpress/wp-content/themes/avenor' },
      { hostPath: resolve('web/wp-content/plugins/avenor-core'), vfsPath: '/wordpress/wp-content/plugins/avenor-core' },
    ],
    blueprint: { steps: [{ step: 'runPHP', code: `<?php
      require '/wordpress/wp-load.php';
      foreach (array('127.0.0.1', '::1', '::ffff:127.0.0.1') as $remote) {
        delete_transient('avenor_rate_' . hash_hmac('sha256', $remote, wp_salt()));
      }
      echo 'Local browser-test inquiry allowance reset.';
      ${cleanup}
    ` }] },
  });
  console.log('Local browser-test inquiry allowance reset.');
}
