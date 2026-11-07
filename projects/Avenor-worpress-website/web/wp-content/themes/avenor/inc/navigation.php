<?php
/** Enhance the core Navigation dialog without replacing its keyboard and focus behavior. @package Avenor */
defined( 'ABSPATH' ) || exit;

add_filter(
	'render_block_core/navigation',
	static function ( $content ) {
		if ( ! str_contains( $content, 'wp-block-navigation__responsive-container-content' ) ) {
			return $content;
		}
		$profile = get_option( 'avenor_business', array() );
		$intro   = '<div class="menu-intro"><a class="menu-wordmark" href="' . esc_url( home_url( '/' ) ) . '">' . esc_html( get_bloginfo( 'name' ) ) . '</a><p class="eyebrow">Explore the practice / AVENOR</p></div>';
		$outro   = '<div class="menu-outro"><p>Have something in mind?</p><a class="menu-conversation" href="' . esc_url( home_url( '/contact/' ) ) . '">Let’s make it happen <span aria-hidden="true">↗</span></a><a class="menu-email" href="mailto:' . esc_attr( $profile['email'] ?? 'hello@example.test' ) . '">' . esc_html( $profile['email'] ?? 'hello@example.test' ) . '</a><p class="menu-note">Strategy × Design × Engineering</p></div>';
		// Insert into the core dialog's content, preserving all interactivity directives.
		return preg_replace_callback(
			'/(<div[^>]+class="wp-block-navigation__responsive-container-content"[^>]*>)(.*?)(<\/div>)/s',
			static fn( $fragment ) => $fragment[1] . $intro . $fragment[2] . $outro . $fragment[3],
			$content,
			1
		);
	}
);
