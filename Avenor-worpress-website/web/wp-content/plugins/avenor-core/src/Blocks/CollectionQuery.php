<?php
/** Focused server-rendered block component. @package Avenor */
namespace Avenor\Core\Blocks;

defined( 'ABSPATH' ) || exit;

final class CollectionQuery {
	public static function prepare( string $kind, array $attributes ): ?array {
		$types    = array(
			'services-grid'     => 'avenor_service',
			'case-studies-grid' => 'avenor_case',
			'team-grid'         => 'avenor_team',
			'testimonials'      => 'avenor_testimonial',
		);
		$type     = $types[ $kind ] ?? 'avenor_service';
		$count    = max( 1, min( 12, (int) ( $attributes['count'] ?? 6 ) ) );
		$columns  = max( 1, min( 3, (int) ( $attributes['columns'] ?? 3 ) ) );
		$taxonomy = 'avenor_case' === $type ? 'avenor_industry' : 'avenor_service_cat';
		$args     = array(
			'post_type'           => $type,
			'post_status'         => 'publish',
			'posts_per_page'      => $count,
			'orderby'             => array(
				'menu_order' => 'ASC',
				'date'       => 'DESC',
			),
			'ignore_sticky_posts' => true,
		);
		$archive  = is_post_type_archive( $type ) || is_tax( $taxonomy );
		// Use the native archive batch size so /page/N routing and grid pages agree.
		$args['posts_per_page'] = $archive ? max( 1, (int) get_query_var( 'posts_per_page', $count ) ) : $count;
		$args['paged']          = $archive ? max( 1, (int) get_query_var( 'paged' ) ) : 1;
		$args['no_found_rows']  = ! $archive;
		$category               = absint( $attributes['category'] ?? 0 );
		if ( is_tax( $taxonomy ) ) {
			$category = get_queried_object_id();
		}
		if ( $category && taxonomy_exists( $taxonomy ) ) {
			$args['tax_query'] = array(
				array(
					'taxonomy' => $taxonomy,
					'field'    => 'term_id',
					'terms'    => $category,
				),
			);
		}
		if ( ! empty( $attributes['featured'] ) ) {
			$args['meta_query'] = array(
				array(
					'key'   => 'avenor_featured',
					'value' => '1',
				),
			);
		}
		$content_kind = $attributes['contentKind'] ?? 'architecture';
		if ( 'avenor_case' === $type && 'all' !== $content_kind ) {
			$args['meta_query'][] = 'project' === $content_kind
				? array(
					'key'   => 'avenor_entry_kind',
					'value' => 'project',
				)
				: array(
					'relation' => 'OR',
					array(
						'key'     => 'avenor_entry_kind',
						'compare' => 'NOT EXISTS',
					),
					array(
						'key'     => 'avenor_entry_kind',
						'value'   => 'project',
						'compare' => '!=',
					),
				);
		}
		if ( ! empty( $attributes['related'] ) && is_singular( array( 'avenor_service', 'avenor_case' ) ) ) {
			$related = array_filter( array_map( 'absint', (array) get_post_meta( get_queried_object_id(), 'avenor_related', true ) ) );
			if ( ! $related ) {
				return null;
			}
			$args['post__in'] = $related;
		}
		return compact( 'type', 'taxonomy', 'args', 'archive', 'category', 'columns', 'content_kind' );
	}
}
