<?php
/** Conservative SEO additions; core handles titles, canonicals and sitemaps. @package Avenor */
defined( 'ABSPATH' ) || exit;
add_action(
	'wp_head',
	static function () {
		if ( defined( 'WPSEO_VERSION' ) || defined( 'RANK_MATH_VERSION' ) || defined( 'AIOSEO_VERSION' ) || is_search() || is_404() ) {
			return;
		}
		$description = is_singular() ? wp_strip_all_tags( get_the_excerpt( get_queried_object_id() ) ) : get_bloginfo( 'description' );
		if ( ! $description ) {
			$description = get_bloginfo( 'description' );
		}
		$url = is_singular() ? get_permalink() : ( is_post_type_archive() ? get_post_type_archive_link( get_query_var( 'post_type' ) ) : home_url( '/' ) );
		if ( is_home() && get_option( 'page_for_posts' ) ) {
			$url = get_permalink( (int) get_option( 'page_for_posts' ) );
		} elseif ( is_tax() || is_category() || is_tag() ) {
			$term_url = get_term_link( get_queried_object() );
			if ( ! is_wp_error( $term_url ) ) {
				$url = $term_url;
			}
		}
		echo '<meta name="description" content="' . esc_attr( wp_trim_words( $description, 32, '' ) ) . '">' . "\n";
		echo '<meta property="og:title" content="' . esc_attr( wp_get_document_title() ) . '">' . "\n";
		echo '<meta property="og:description" content="' . esc_attr( $description ) . '">' . "\n";
		echo '<meta property="og:type" content="' . esc_attr( is_singular( 'post' ) ? 'article' : 'website' ) . '">' . "\n";
		echo '<meta property="og:url" content="' . esc_url( $url ) . '">' . "\n";
		if ( is_singular() && has_post_thumbnail() ) {
			echo '<meta property="og:image" content="' . esc_url( get_the_post_thumbnail_url( get_queried_object_id(), 'large' ) ) . '">' . "\n";
		}
	}
);
