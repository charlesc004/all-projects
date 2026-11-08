<?php
/** Settings API business profile. @package Avenor */
namespace Avenor\Core\Settings;

defined( 'ABSPATH' ) || exit;

final class BusinessSettings {
	public const FIELDS = array(
		'name'               => 'Company name',
		'tagline'            => 'Tagline',
		'email'              => 'Contact email',
		'phone'              => 'Phone',
		'address'            => 'Address',
		'linkedin'           => 'LinkedIn URL',
		'instagram'          => 'Instagram URL',
		'notification_email' => 'Inquiry notification email',
		'cta_label'          => 'Contact CTA label',
		'retention_days'     => 'Inquiry retention days (0 = indefinite)',
	);

	public static function boot(): void {
		add_action( 'admin_menu', static fn() => add_options_page( 'AVENOR business', 'AVENOR business', 'manage_options', 'avenor-business', array( self::class, 'page' ) ) );
		add_action(
			'admin_init',
			static function () {
				register_setting(
					'avenor_business',
					'avenor_business',
					array(
						'type'              => 'array',
						'sanitize_callback' => array( self::class, 'sanitize' ),
						'default'           => array(),
					)
				);
				add_settings_section( 'avenor_profile', 'Business profile & inquiry handling', '__return_false', 'avenor-business' );
				foreach ( self::FIELDS as $key => $label ) {
					add_settings_field(
						$key,
						$label,
						static function () use ( $key ) {
							$value = get_option( 'avenor_business', array() )[ $key ] ?? ( 'retention_days' === $key ? 365 : '' );
							$type  = str_contains( $key, 'email' ) ? 'email' : ( 'retention_days' === $key ? 'number' : 'text' );
							echo '<input class="regular-text" id="avenor-' . esc_attr( $key ) . '" type="' . esc_attr( $type ) . '" name="avenor_business[' . esc_attr( $key ) . ']" value="' . esc_attr( $value ) . '"' . ( 'number' === $type ? ' min="0" max="3650"' : '' ) . '>';
						},
						'avenor-business',
						'avenor_profile',
						array( 'label_for' => 'avenor-' . $key )
					);
				}
			}
		);
	}

	public static function sanitize( mixed $input ): array {
		$result = array();
		$input  = is_array( $input ) ? $input : array();
		foreach ( self::FIELDS as $key => $label ) {
			$value = is_scalar( $input[ $key ] ?? '' ) ? (string) ( $input[ $key ] ?? '' ) : '';
			if ( str_contains( $key, 'email' ) ) {
				if ( $value && ! is_email( $value ) ) {
					add_settings_error( 'avenor_business', $key, $label . ' must be a valid email address.' );
					$value = get_option( 'avenor_business', array() )[ $key ] ?? '';
				}
				$result[ $key ] = sanitize_email( $value );
			} elseif ( in_array( $key, array( 'linkedin', 'instagram' ), true ) ) {
				$result[ $key ] = esc_url_raw( $value, array( 'https' ) );
			} elseif ( 'retention_days' === $key ) {
				$result[ $key ] = min( 3650, absint( $value ) );
			} else {
				$result[ $key ] = sanitize_text_field( mb_substr( $value, 0, 300, 'UTF-8' ) );
			}
		}
		return $result;
	}

	public static function page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		echo '<div class="wrap"><h1>AVENOR business</h1><p>Inquiries are private. Mail delivery requires a configured mail transport. Retention runs daily through WP-Cron.</p><form action="options.php" method="post">';
		settings_fields( 'avenor_business' );
		do_settings_sections( 'avenor-business' );
		submit_button();
		echo '</form></div>';
	}
}
