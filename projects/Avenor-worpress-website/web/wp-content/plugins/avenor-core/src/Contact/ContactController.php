<?php
/** Public REST endpoint and progressive HTML form transport. @package Avenor */
namespace Avenor\Core\Contact;

defined( 'ABSPATH' ) || exit;

final class ContactController {
	public static function boot(): void {
		add_action( 'admin_post_nopriv_avenor_contact', array( self::class, 'html' ) );
		add_action( 'admin_post_avenor_contact', array( self::class, 'html' ) );
	}

	public static function html(): void {
		if ( (int) ( $_SERVER['CONTENT_LENGTH'] ?? 0 ) > 16000 ) {
			wp_die( 'The inquiry is too large.', 'Inquiry error', array( 'response' => 413 ) );
		}
		// This intentionally anonymous action shares REST validation and abuse controls.
		$data   = wp_unslash( $_POST ); // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Anonymous public submission, not an authenticated action.
		$result = ContactService::submit( $data, sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ?? 'unknown' ) ) );
		$status = is_wp_error( $result ) ? $result->get_error_code() : 'sent';
		wp_safe_redirect( add_query_arg( 'inquiry', $status, home_url( '/contact/' ) ) );
		exit;
	}

	public static function register(): void {
		register_rest_route(
			'avenor/v1',
			'/contact',
			array(
				'methods'             => 'POST',
				'permission_callback' => '__return_true',
				'callback'            => array( self::class, 'handle' ),
			)
		);
	}

	public static function handle( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		if ( strlen( $request->get_body() ) > 16000 ) {
			return new \WP_Error( 'payload_too_large', 'The inquiry is too large.', array( 'status' => 413 ) );
		}
		$data = $request->get_json_params();
		if ( ! is_array( $data ) ) {
			return new \WP_Error( 'invalid_json', 'Send a JSON object.', array( 'status' => 400 ) );
		}
		$result = ContactService::submit( $data, sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ?? 'unknown' ) ) );
		return is_wp_error( $result ) ? $result : new \WP_REST_Response( $result, 201 );
	}
}
