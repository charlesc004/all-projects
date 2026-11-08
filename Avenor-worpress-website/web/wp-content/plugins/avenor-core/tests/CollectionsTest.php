<?php
/** Collection selection and publishing boundaries. @package Avenor */
use Avenor\Core\Blocks\BlockRegistrar;
use PHPUnit\Framework\TestCase;

final class CollectionsTest extends TestCase {
	public function test_archive_grid_uses_native_pagination_batch_size(): void {
		global $wp_query;
		$original = $wp_query;
		$ids      = array();
		try {
			for ( $i = 0; $i < 3; ++$i ) {
				$ids[] = wp_insert_post(
					array(
						'post_type'   => 'avenor_case',
						'post_status' => 'publish',
						'post_title'  => 'Pagination boundary ' . $i,
						'menu_order'  => $i,
					)
				);
			}
			$wp_query = new WP_Query(
				array(
					'post_type'      => 'avenor_case',
					'posts_per_page' => 2,
					'paged'          => 2,
					'orderby'        => 'menu_order',
					'order'          => 'ASC',
				)
			);
			$this->assertCount( 1, $wp_query->posts );
			$html = BlockRegistrar::grid( 'case-studies-grid', array( 'count' => 6 ) );
			$this->assertStringContainsString( 'Pagination boundary 2', $html );
			$this->assertStringNotContainsString( 'Pagination boundary 0', $html );
		} finally {
			$wp_query = $original;
			foreach ( $ids as $id ) {
				wp_delete_post( $id, true );
			}
		}
	}
	public function test_architectures_and_projects_are_separate_and_drafts_stay_private(): void {
		$ids = array();
		try {
			foreach ( array( 'architecture', 'project', 'draft' ) as $kind ) {
				$id    = wp_insert_post(
					array(
						'post_type'   => 'avenor_case',
						'post_status' => 'draft' === $kind ? 'draft' : 'publish',
						'post_title'  => 'Collection boundary ' . $kind,
					)
				);
				$ids[] = $id;
				if ( 'architecture' !== $kind ) {
					update_post_meta( $id, 'avenor_entry_kind', 'project' );
				}
				update_post_meta( $id, 'avenor_featured', true );
			}
			$architectures = BlockRegistrar::grid( 'case-studies-grid', array( 'featured' => true ) );
			$this->assertStringContainsString( 'Collection boundary architecture', $architectures );
			$this->assertStringNotContainsString( 'Collection boundary project', $architectures );
			$projects = BlockRegistrar::grid(
				'case-studies-grid',
				array(
					'contentKind' => 'project',
					'featured'    => true,
				)
			);
			$this->assertStringContainsString( 'Collection boundary project', $projects );
			$this->assertStringNotContainsString( 'Collection boundary architecture', $projects );
			$this->assertStringNotContainsString( 'Collection boundary draft', $projects );
			$all = BlockRegistrar::grid( 'case-studies-grid', array( 'contentKind' => 'all' ) );
			$this->assertStringContainsString( 'Collection boundary architecture', $all );
			$this->assertStringContainsString( 'Collection boundary project', $all );
		} finally {
			foreach ( $ids as $id ) {
				wp_delete_post( $id, true );
			}
		}
	}

	public function test_people_and_quotes_require_publication(): void {
		foreach ( array(
			'team-grid'    => 'avenor_team',
			'testimonials' => 'avenor_testimonial',
		) as $kind => $type ) {
			$id = wp_insert_post(
				array(
					'post_type'    => $type,
					'post_status'  => 'draft',
					'post_title'   => 'Private editorial identity',
					'post_content' => 'Private approval copy.',
				)
			);
			try {
				$html = BlockRegistrar::grid( $kind, array() );
				$this->assertStringNotContainsString( 'Private editorial identity', $html );
				$this->assertStringNotContainsString( 'Private approval copy', $html );
				$this->assertStringContainsString( 'Talk to the studio', $html );
				wp_update_post(
					array(
						'ID'          => $id,
						'post_status' => 'publish',
					)
				);
				$this->assertStringContainsString( 'Private editorial identity', BlockRegistrar::grid( $kind, array() ) );
			} finally {
				wp_delete_post( $id, true );
			}
		}
	}
}
