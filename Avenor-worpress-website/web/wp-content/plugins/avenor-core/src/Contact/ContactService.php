<?php
/** Persistence before notification; abuse controls without trusting forwarded IPs. @package Avenor */
namespace Avenor\Core\Contact;

defined( 'ABSPATH' ) || exit;

final class ContactService {
	public const SUCCESS_MESSAGE = 'Your inquiry has been received. Thank you.';
	public static function submit( array $data, string $remote ): array|\WP_Error {
		$clean = Validation::check( $data );
		if ( is_wp_error( $clean ) ) {
			return $clean;
		}
		if ( $clean['website'] ) {
			return new \WP_Error( 'spam', 'This submission could not be accepted.', array( 'status' => 422 ) );
		}
		$fingerprint = hash_hmac( 'sha256', strtolower( $clean['email'] ) . '|' . $clean['message'], wp_salt() );
		$identity    = hash_hmac( 'sha256', $remote, wp_salt() );
		// Unique options serialize both a network allowance and cross-network duplicates.
		$lock           = 'avenor_lock_' . $identity;
		$duplicate_lock = 'avenor_duplicate_lock_' . $fingerprint;
		if ( ! self::acquire( $lock ) ) {
			return new \WP_Error( 'busy', 'A request is already processing. Please retry shortly.', array( 'status' => 429 ) );
		}
		if ( ! self::acquire( $duplicate_lock ) ) {
			delete_option( $lock );
			return new \WP_Error( 'busy', 'This inquiry is already processing. Please retry shortly.', array( 'status' => 429 ) );
		}
		try {
			if ( get_transient( 'avenor_duplicate_' . $fingerprint ) ) {
				return array(
					'message'   => self::SUCCESS_MESSAGE,
					'duplicate' => true,
				);
			}
			$rate_key = 'avenor_rate_' . $identity;
			$rate     = get_transient( $rate_key );
			if ( ! is_array( $rate ) || $rate['until'] < time() ) {
				$rate = array(
					'count' => 0,
					'until' => time() + HOUR_IN_SECONDS,
				);
			}
			if ( $rate['count'] >= 5 ) {
				return new \WP_Error( 'rate_limited', 'Too many inquiries. Please try again in an hour.', array( 'status' => 429 ) );
			}
			$id = wp_insert_post(
				array(
					'post_type'    => 'avenor_inquiry',
					'post_status'  => 'private',
					'post_title'   => $clean['name'] . ' — ' . $clean['company'],
					'post_content' => $clean['message'],
				),
				true
			);
			if ( is_wp_error( $id ) ) {
				return new \WP_Error( 'persistence_failed', 'We could not save your inquiry. Please retry.', array( 'status' => 503 ) );
			}
			foreach ( array( 'name', 'email', 'company', 'service' ) as $key ) {
				update_post_meta( $id, '_avenor_' . $key, $clean[ $key ] );
			}
			update_post_meta( $id, '_avenor_status', 'new' );
			update_post_meta( $id, '_avenor_privacy', gmdate( 'c' ) );
			set_transient( 'avenor_duplicate_' . $fingerprint, $id, DAY_IN_SECONDS );
			++$rate['count'];
			set_transient( $rate_key, $rate, max( 1, $rate['until'] - time() ) );
			$settings = get_option( 'avenor_business', array() );
			$to       = $settings['notification_email'] ?? get_option( 'admin_email' );
			$sent     = wp_mail( $to, 'New AVENOR inquiry', 'A new inquiry is available in WordPress: ' . admin_url( 'post.php?post=' . $id . '&action=edit' ) );
			update_post_meta( $id, '_avenor_mail_sent', $sent ? 'yes' : 'no' );
			return array( 'message' => self::SUCCESS_MESSAGE );
		} finally {
			delete_option( $lock );
			delete_option( $duplicate_lock );
		}
	}

	private static function acquire( string $key ): bool {
		$existing = (int) get_option( $key, 0 );
		if ( $existing && $existing < time() - 30 ) {
			delete_option( $key );
		}
		return add_option( $key, time(), '', false );
	}
}
