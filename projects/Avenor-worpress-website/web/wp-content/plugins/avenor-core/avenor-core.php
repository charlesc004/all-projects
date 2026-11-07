<?php
/**
 * Plugin Name: AVENOR Core
 * Description: Structured content, editor blocks and private inquiry management for AVENOR.
 * Version: 1.0.0
 * Requires at least: 6.6
 * Requires PHP: 8.3
 * Text Domain: avenor-core
 * License: GPL-2.0-or-later
 *
 * @package Avenor
 */

namespace Avenor\Core;

defined( 'ABSPATH' ) || exit;

spl_autoload_register(
	static function ( $class_name ) {
		$prefix = __NAMESPACE__ . '\\';
		if ( str_starts_with( $class_name, $prefix ) ) {
			$file = __DIR__ . '/src/' . str_replace( '\\', '/', substr( $class_name, strlen( $prefix ) ) ) . '.php';
			if ( is_readable( $file ) ) {
				require_once $file;
			}
		}
	}
);

register_activation_hook( __FILE__, array( Plugin::class, 'activate' ) );
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );
Plugin::boot( __FILE__ );
