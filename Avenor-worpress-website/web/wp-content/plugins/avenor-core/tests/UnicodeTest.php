<?php
/** International input must obey character limits rather than byte counts. @package Avenor */
use Avenor\Core\Contact\Validation;
use Avenor\Core\Settings\BusinessSettings;
use PHPUnit\Framework\TestCase;

final class UnicodeTest extends TestCase {
	public function test_contact_uses_character_limits_for_multilingual_input(): void {
		$data = array(
			'name'    => str_repeat( 'ع', 120 ),
			'email'   => 'unicode@example.test',
			'message' => str_repeat( 'س', 20 ),
			'privacy' => true,
		);
		$this->assertIsArray( Validation::check( $data ) );
		$this->assertInstanceOf( WP_Error::class, Validation::check( array_replace( $data, array( 'name' => 'ع' ) ) ) );
		$this->assertInstanceOf( WP_Error::class, Validation::check( array_replace( $data, array( 'name' => str_repeat( 'ع', 121 ) ) ) ) );
		$this->assertInstanceOf( WP_Error::class, Validation::check( array_replace( $data, array( 'message' => str_repeat( 'س', 19 ) ) ) ) );
	}
	public function test_business_text_truncation_preserves_utf8(): void {
		$settings = BusinessSettings::sanitize( array( 'name' => str_repeat( 'ع', 301 ) ) );
		$this->assertSame( str_repeat( 'ع', 300 ), $settings['name'] );
		$this->assertSame( 1, preg_match( '//u', $settings['name'] ) );
	}
}
