<?php
/** Versioned frontend modules and compiled styles. @package Avenor */
defined( 'ABSPATH' ) || exit;

function avenor_asset_version( string $path ): string {
	return (string) filemtime( get_theme_file_path( 'assets/' . $path ) );
}

add_action(
	'wp_enqueue_scripts',
	static function () {
		wp_enqueue_style( 'avenor-site', get_theme_file_uri( 'assets/build/site.css' ), array(), avenor_asset_version( 'build/site.css' ) );
		$modules = wp_json_file_decode( get_theme_file_path( 'assets/modules.json' ), array( 'associative' => true ) );
		foreach ( $modules as $id => $module ) {
			wp_register_script_module( $id, get_theme_file_uri( 'assets/' . $module['file'] ), $module['dependencies'], avenor_asset_version( $module['file'] ) );
			if ( ! empty( $module['entry'] ) ) {
				wp_enqueue_script_module( $id );
			}
		}
	}
);
