<?php
/** Native personal-data tools and explicit configurable retention. @package Avenor */
namespace Avenor\Core\Contact;

defined( 'ABSPATH' ) || exit;

final class Privacy {
	public static function boot(): void {
		add_filter(
			'wp_privacy_personal_data_exporters',
			static function ( $exporters ) {
				$exporters['avenor'] = array(
					'exporter_friendly_name' => 'AVENOR inquiries',
					'callback'               => array( self::class, 'export' ),
				);
				return $exporters;
			}
		);
		add_filter(
			'wp_privacy_personal_data_erasers',
			static function ( $erasers ) {
				$erasers['avenor'] = array(
					'eraser_friendly_name' => 'AVENOR inquiries',
					'callback'             => array( self::class, 'erase' ),
				);
				return $erasers;
			}
		);
	}

	private static function find( string $email, int $page = 1 ): array {
		return get_posts(
			array(
				'post_type'      => 'avenor_inquiry',
				'post_status'    => 'any',
				'posts_per_page' => 100,
				'paged'          => $page,
				'orderby'        => 'ID',
				'order'          => 'ASC',
				'meta_key'       => '_avenor_email',
				'meta_value'     => $email,
			)
		); // phpcs:ignore WordPress.DB.SlowDBQuery -- Bounded privacy lookup.
	}

	public static function export( string $email, int $page = 1 ): array {
		$posts = self::find( $email, $page );
		$data  = array();
		foreach ( $posts as $post ) {
			$fields = array(
				array(
					'name'  => 'Message',
					'value' => $post->post_content,
				),
			);
			foreach ( array( 'name', 'email', 'company', 'service', 'privacy', 'status' ) as $key ) {
				$fields[] = array(
					'name'  => ucfirst( $key ),
					'value' => get_post_meta( $post->ID, '_avenor_' . $key, true ),
				);
			}
			$data[] = array(
				'group_id'    => 'avenor-inquiries',
				'group_label' => 'AVENOR inquiries',
				'item_id'     => 'inquiry-' . $post->ID,
				'data'        => $fields,
			);
		}
		return array(
			'data' => $data,
			'done' => count( $posts ) < 100,
		);
	}

	public static function erase( string $email, int $page = 1 ): array {
		// Always use the first batch because deleted rows must not shift past pagination.
		$posts   = self::find( $email );
		$removed = false;
		foreach ( $posts as $post ) {
			$removed = (bool) wp_delete_post( $post->ID, true ) || $removed;
		}
		return array(
			'items_removed'  => $removed,
			'items_retained' => false,
			'messages'       => array(),
			'done'           => count( $posts ) < 100,
		);
	}

	public static function retention(): void {
		$days = (int) ( get_option( 'avenor_business', array() )['retention_days'] ?? 365 );
		if ( $days < 1 ) {
			return;
		}
		$ids = get_posts(
			array(
				'post_type'      => 'avenor_inquiry',
				'post_status'    => 'any',
				'fields'         => 'ids',
				'posts_per_page' => 100,
				'date_query'     => array( array( 'before' => gmdate( 'Y-m-d H:i:s', time() - $days * DAY_IN_SECONDS ) ) ),
			)
		);
		foreach ( $ids as $id ) {
			wp_delete_post( $id, true );
		}
	}
}
