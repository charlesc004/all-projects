<?php
/** Isolated real WordPress database, never the preview or production database. */
$avenor_root = dirname( __DIR__, 2 );
require $avenor_root . '/vendor/autoload.php';
if ( getenv( 'AVENOR_TEST_WP_ROOT' ) ) {
	// CI may provide a disposable MySQL WordPress installation instead.
	require rtrim( getenv( 'AVENOR_TEST_WP_ROOT' ), '/\\' ) . '/wp-load.php';
	require_once $avenor_root . '/web/wp-content/plugins/avenor-core/avenor-core.php';
} else {
	$avenor_wp = $avenor_root . '/.runtime/site/';
	$avenor_sqlite = $avenor_root . '/.runtime/plugin-sqlite-database-integration';
	if ( ! is_file( $avenor_wp . 'wp-settings.php' ) || ! is_file( $avenor_sqlite . '/db.copy' ) ) {
		throw new RuntimeException( 'Run npm run dev once and npm run prepare:php-tests, or set AVENOR_TEST_WP_ROOT to a disposable WordPress installation.' );
	}
	$avenor_content = $avenor_root . '/.runtime/phpunit-content-' . getmypid();
	if ( ! is_dir( $avenor_content . '/mu-plugins' ) ) {
		mkdir( $avenor_content . '/mu-plugins', 0777, true );
	}
	file_put_contents( $avenor_content . '/db.php', str_replace( '{SQLITE_IMPLEMENTATION_FOLDER_PATH}', str_replace( '\\', '/', $avenor_sqlite ), file_get_contents( $avenor_sqlite . '/db.copy' ) ) );
	define( 'ABSPATH', $avenor_wp );
	define( 'WP_CONTENT_DIR', $avenor_content );
	define( 'WP_CONTENT_URL', 'http://avenor.test/wp-content' );
	define( 'WP_PLUGIN_DIR', $avenor_root . '/web/wp-content/plugins' );
	define( 'WP_PLUGIN_URL', 'http://avenor.test/wp-content/plugins' );
	define( 'DB_NAME', 'avenor_test' );
	define( 'DB_USER', 'unused' );
	define( 'DB_PASSWORD', 'unused' );
	define( 'DB_HOST', 'unused' );
	define( 'DB_PATH', $avenor_content . '/test.sqlite' );
	define( 'DB_ENGINE', 'sqlite' );
	define( 'WP_INSTALLING', true );
	define( 'WP_DEBUG', true );
	define( 'WP_DEBUG_DISPLAY', false );
	define( 'DISABLE_WP_CRON', true );
	define( 'WP_HTTP_BLOCK_EXTERNAL', true );
	define( 'WP_SITEURL', 'http://avenor.test' );
	define( 'WP_HOME', 'http://avenor.test' );
	$table_prefix = 'wp_';
	$_SERVER['HTTP_HOST'] = 'avenor.test';
	$_SERVER['SERVER_PROTOCOL'] = 'HTTP/1.1';
	$_SERVER['REQUEST_URI'] = '/';
	require ABSPATH . 'wp-settings.php';
	require_once ABSPATH . 'wp-admin/includes/upgrade.php';
	wp_install( 'AVENOR test', 'test_admin', 'test@example.test', false, '', 'isolated-test-password' );
	require_once $avenor_root . '/web/wp-content/plugins/avenor-core/avenor-core.php';
}
\Avenor\Core\Plugin::activate();
\Avenor\Core\Content\Models::register();
\Avenor\Core\Blocks\BlockRegistrar::register( $avenor_root . '/web/wp-content/plugins/avenor-core/avenor-core.php' );
// Deliberately fail notifications to verify persistence survives delivery failures.
add_filter( 'pre_wp_mail', '__return_false' );
