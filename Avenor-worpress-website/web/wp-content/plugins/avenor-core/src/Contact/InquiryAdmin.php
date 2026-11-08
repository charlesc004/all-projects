<?php
/** Native inquiry list, private details and authorized status changes. @package Avenor */
namespace Avenor\Core\Contact;

defined( 'ABSPATH' ) || exit;

final class InquiryAdmin {
	public const STATUSES = array(
		'new'         => 'New',
		'in-progress' => 'In progress',
		'resolved'    => 'Resolved',
		'spam'        => 'Spam',
	);

	public static function boot(): void {
		add_action( 'add_meta_boxes_avenor_inquiry', array( self::class, 'boxes' ) );
		add_action( 'save_post_avenor_inquiry', array( self::class, 'save' ) );
		add_filter(
			'manage_avenor_inquiry_posts_columns',
			static function ( $columns ) {
				$columns['avenor_status'] = 'Inquiry status';
				$columns['avenor_email']  = 'Email';
				return $columns;
			}
		);
		add_action(
			'manage_avenor_inquiry_posts_custom_column',
			static function ( $column, $id ) {
				if ( 'avenor_status' === $column ) {
					echo esc_html( self::STATUSES[ get_post_meta( $id, '_avenor_status', true ) ] ?? 'New' );
				} elseif ( 'avenor_email' === $column ) {
					echo esc_html( get_post_meta( $id, '_avenor_email', true ) );
				}
			},
			10,
			2
		);
		add_action(
			'restrict_manage_posts',
			static function ( $type ) {
				if ( 'avenor_inquiry' !== $type ) {
					return;
				}
				$value = isset( $_GET['inquiry_status'] ) ? sanitize_key( wp_unslash( $_GET['inquiry_status'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only admin filter.
				echo '<label class="screen-reader-text" for="inquiry-status">Inquiry status</label><select id="inquiry-status" name="inquiry_status"><option value="">All inquiry statuses</option>';
				foreach ( self::STATUSES as $key => $label ) {
					echo '<option value="' . esc_attr( $key ) . '" ' . selected( $value, $key, false ) . '>' . esc_html( $label ) . '</option>';
				}
				echo '</select>';
			}
		);
		add_action(
			'pre_get_posts',
			static function ( $query ) {
				if ( is_admin() && $query->is_main_query() && 'avenor_inquiry' === $query->get( 'post_type' ) && current_user_can( 'edit_inquiries' ) ) {
					$status = isset( $_GET['inquiry_status'] ) ? sanitize_key( wp_unslash( $_GET['inquiry_status'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only admin filter.
					if ( isset( self::STATUSES[ $status ] ) ) {
						$query->set(
							'meta_query',
							array(
								array(
									'key'   => '_avenor_status',
									'value' => $status,
								),
							)
						);
					}
				}
			}
		);
	}

	public static function boxes(): void {
		add_meta_box( 'avenor-inquiry', 'Inquiry details', array( self::class, 'details' ), 'avenor_inquiry', 'normal', 'high' );
	}

	public static function details( \WP_Post $post ): void {
		if ( ! current_user_can( 'edit_post', $post->ID ) ) {
			return;
		}
		wp_nonce_field( 'avenor_inquiry', 'avenor_inquiry_nonce' );
		foreach ( array( 'name', 'email', 'company', 'service', 'privacy', 'mail_sent' ) as $key ) {
			echo '<p><strong>' . esc_html( ucwords( str_replace( '_', ' ', $key ) ) ) . ':</strong> ' . esc_html( get_post_meta( $post->ID, '_avenor_' . $key, true ) ) . '</p>';
		}
		echo '<h3>Message</h3><p style="white-space:pre-wrap">' . esc_html( $post->post_content ) . '</p><label for="avenor-status">Status</label> <select id="avenor-status" name="avenor_status">';
		foreach ( self::STATUSES as $key => $label ) {
			echo '<option value="' . esc_attr( $key ) . '" ' . selected( get_post_meta( $post->ID, '_avenor_status', true ), $key, false ) . '>' . esc_html( $label ) . '</option>';
		}
		echo '</select>';
	}

	public static function save( int $id ): void {
		if ( wp_is_post_revision( $id ) || wp_is_post_autosave( $id ) || ! current_user_can( 'edit_post', $id ) || ! isset( $_POST['avenor_inquiry_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['avenor_inquiry_nonce'] ) ), 'avenor_inquiry' ) ) {
			return;
		}
		$status = sanitize_key( wp_unslash( $_POST['avenor_status'] ?? '' ) );
		if ( isset( self::STATUSES[ $status ] ) ) {
			update_post_meta( $id, '_avenor_status', $status );
		}
	}
}
