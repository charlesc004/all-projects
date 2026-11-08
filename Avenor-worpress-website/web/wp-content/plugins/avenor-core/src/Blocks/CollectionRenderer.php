<?php
/** Focused server-rendered block component. @package Avenor */
namespace Avenor\Core\Blocks;

defined( 'ABSPATH' ) || exit;

final class CollectionRenderer {
	public static function render( string $kind, array $attributes ): string {
		$config = CollectionQuery::prepare( $kind, $attributes );
		if ( null === $config ) {
			return '';
		}
		$type          = $config['type'];
		$taxonomy      = $config['taxonomy'];
		$archive       = $config['archive'];
		$category      = $config['category'];
		$columns       = $config['columns'];
		$content_kind  = $config['content_kind'];
		$args          = $config['args'];
		$query         = new \WP_Query( $args );
		$heading_level = $archive && empty( $attributes['heading'] ) ? 2 : 3;
		$terms         = $archive && taxonomy_exists( $taxonomy ) ? get_terms(
			array(
				'taxonomy'   => $taxonomy,
				'hide_empty' => true,
			)
		) : array();
		$terms         = is_wp_error( $terms ) ? array() : $terms;
		ob_start();
		require __DIR__ . '/views/collection.php';
		return ob_get_clean();
	}
}
