<?php
/** Theme setup and design assets. @package Avenor */
defined( 'ABSPATH' ) || exit;
add_action(
	'after_setup_theme',
	static function () {
		add_theme_support( 'post-thumbnails' );
		add_theme_support( 'editor-styles' );
		add_editor_style( 'assets/build/editor.css' );
		add_theme_support( 'responsive-embeds' );
		add_image_size( 'avenor-landscape', 1440, 960, true );
	}
);
add_action( 'init', static fn() => register_block_pattern_category( 'avenor', array( 'label' => 'AVENOR editorial' ) ) );
add_filter( 'excerpt_length', static fn() => 24 );

// Theme-authored root-relative links also work when WordPress lives in a subdirectory.
add_filter(
	'render_block',
	static function ( $content, $block ) {
		if ( ! str_starts_with( $block['blockName'] ?? '', 'core/' ) || ! str_contains( $content, 'href="/' ) ) {
			return $content;
		}
		$tags = new WP_HTML_Tag_Processor( $content );
		while ( $tags->next_tag( 'A' ) ) {
			$href = $tags->get_attribute( 'href' );
			if ( is_string( $href ) && str_starts_with( $href, '/' ) && ! str_starts_with( $href, '//' ) ) {
				$tags->set_attribute( 'href', home_url( $href ) );
			}
		}
		return $tags->get_updated_html();
	},
	10,
	2
);
