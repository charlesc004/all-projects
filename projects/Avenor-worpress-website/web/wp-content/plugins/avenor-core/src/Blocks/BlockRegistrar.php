<?php
/** Small dynamic blocks; one bounded query and one card renderer per content type. @package Avenor */
namespace Avenor\Core\Blocks;

defined( 'ABSPATH' ) || exit;

final class BlockRegistrar {
	public static function register( string $file ): void {
		$root = dirname( $file );
		foreach ( glob( $root . '/blocks/*/block.json' ) as $metadata ) {
			register_block_type( dirname( $metadata ) );
		}
		wp_register_script(
			'avenor-contact',
			plugins_url( 'assets/js/contact.js', $file ),
			array(),
			'1.0.0',
			array(
				'in_footer' => true,
				'strategy'  => 'defer',
			)
		);
		add_action(
			'enqueue_block_editor_assets',
			static function () use ( $root, $file ) {
				$asset = $root . '/build/index.asset.php';
				if ( is_readable( $asset ) ) {
					$config = require $asset;
					wp_enqueue_script( 'avenor-blocks-editor', plugins_url( 'build/index.js', $file ), $config['dependencies'], $config['version'], true );
				}
			}
		);
	}

	// Keep the public block callback API stable while components own rendering.
	public static function grid( string $kind, array $attributes ): string {
		return CollectionRenderer::render( $kind, $attributes );
	}
	public static function profile(): string {
		return BusinessProfile::render();
	}
	public static function form(): string {
		return ContactForm::render();
	}
}
