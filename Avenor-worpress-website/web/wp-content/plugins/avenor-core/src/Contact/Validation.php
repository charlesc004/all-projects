<?php
/** Pure validation shared by both HTTP transports. @package Avenor */
namespace Avenor\Core\Contact;

defined( 'ABSPATH' ) || exit;

final class Validation {
	public const LIMITS     = array(
		'name'    => 120,
		'email'   => 254,
		'company' => 180,
		'service' => 180,
		'message' => 5000,
		'website' => 200,
	);
	public const MIN_LENGTH = array(
		'name'    => 2,
		'message' => 20,
	);

	public static function check( array $data ): array|\WP_Error {
		foreach ( self::LIMITS as $key => $limit ) {
			if ( isset( $data[ $key ] ) && ( ! is_string( $data[ $key ] ) || mb_strlen( $data[ $key ], 'UTF-8' ) > $limit ) ) {
				return new \WP_Error( 'invalid_field', 'Please shorten the ' . $key . ' field.', array( 'status' => 422 ) );
			}
		}
		$clean = array();
		foreach ( self::LIMITS as $key => $limit ) {
			$clean[ $key ] = 'message' === $key ? sanitize_textarea_field( $data[ $key ] ?? '' ) : sanitize_text_field( $data[ $key ] ?? '' );
		}
		if ( mb_strlen( $clean['name'], 'UTF-8' ) < self::MIN_LENGTH['name'] || ! is_email( $clean['email'] ) || mb_strlen( $clean['message'], 'UTF-8' ) < self::MIN_LENGTH['message'] || ! in_array( $data['privacy'] ?? false, array( true, 1, '1' ), true ) ) {
			return new \WP_Error( 'invalid_fields', 'Enter your name, a valid email, a message of at least 20 characters, and acknowledge the privacy notice.', array( 'status' => 422 ) );
		}
		if ( $clean['service'] ) {
			$service = get_page_by_path( $clean['service'], OBJECT, 'avenor_service' );
			if ( ! $service || 'publish' !== $service->post_status ) {
				return new \WP_Error( 'invalid_service', 'Please choose an available service.', array( 'status' => 422 ) );
			}
		}
		return $clean;
	}
}
