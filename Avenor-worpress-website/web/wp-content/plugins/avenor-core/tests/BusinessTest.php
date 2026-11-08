<?php
use Avenor\Core\Contact\ContactController;
use Avenor\Core\Contact\ContactService;
use Avenor\Core\Contact\Privacy;
use Avenor\Core\Contact\Validation;
use Avenor\Core\Blocks\BlockRegistrar;
use Avenor\Core\Settings\BusinessSettings;
use PHPUnit\Framework\TestCase;

final class BusinessTest extends TestCase {
	private function payload( string $suffix = '' ): array {
		return array(
			'name'    => 'Test Person',
			'email'   => 'person' . $suffix . '@example.test',
			'company' => 'Integration test organization',
			'message' => 'A real integration test message about an integration scenario ' . $suffix,
			'privacy' => true,
		);
	}
	public function test_models_and_private_inquiry_permissions(): void {
		foreach ( array( 'avenor_service', 'avenor_case', 'avenor_team', 'avenor_testimonial' ) as $type ) {
			$this->assertTrue( get_post_type_object( $type )->show_in_rest );
			$this->assertTrue( post_type_supports( $type, 'editor' ) );
		}
		$this->assertTrue( taxonomy_exists( 'avenor_service_cat' ) );
		$this->assertTrue( taxonomy_exists( 'avenor_industry' ) );
		$this->assertFalse( get_post_type_object( 'avenor_inquiry' )->public );
		$this->assertFalse( get_post_type_object( 'avenor_inquiry' )->show_in_rest );
		wp_set_current_user( 0 );
		$this->assertFalse( current_user_can( 'edit_inquiries' ) );
		wp_set_current_user( 1 );
		$this->assertTrue( current_user_can( 'edit_inquiries' ) );
		$editor = wp_insert_user(
			array(
				'user_login' => 'editor_test',
				'user_pass'  => 'test-only-password',
				'role'       => 'editor',
			)
		);
		wp_set_current_user( $editor );
		$this->assertFalse( current_user_can( 'edit_inquiries' ) );
		wp_set_current_user( 0 );
	}
	public function test_validation_rejects_invalid_types_lengths_and_consent(): void {
		foreach ( array( array( 'email' => 'wrong' ), array( 'privacy' => false ), array( 'message' => 'short' ), array( 'name' => array( 'attack' ) ), array( 'company' => str_repeat( 'a', 181 ) ), array( 'service' => 'unavailable' ) ) as $invalid ) {
			$this->assertWPError( Validation::check( array_replace( $this->payload(), $invalid ) ) );
		}
		$this->assertIsArray( Validation::check( $this->payload() ) );
	}
	public function test_persistence_deduplication_and_email_failure(): void {
		$data = $this->payload( 'persist' );
		$this->assertIsArray( ContactService::submit( $data, '192.0.2.10' ) );
		$posts = get_posts(
			array(
				'post_type'   => 'avenor_inquiry',
				'post_status' => 'private',
				'meta_key'    => '_avenor_email',
				'meta_value'  => $data['email'],
			)
		);
		$this->assertCount( 1, $posts );
		$this->assertSame( 'no', get_post_meta( $posts[0]->ID, '_avenor_mail_sent', true ) );
		$this->assertSame( 'new', get_post_meta( $posts[0]->ID, '_avenor_status', true ) );
		$this->assertTrue( ContactService::submit( $data, '192.0.2.10' )['duplicate'] );
		$this->assertSame( 1, (int) wp_count_posts( 'avenor_inquiry' )->private );
	}
	public function test_spam_rate_limit_and_concurrent_lock(): void {
		$this->assertWPError( ContactService::submit( array_replace( $this->payload(), array( 'website' => 'spam' ) ), '192.0.2.11' ) );
		for ( $i = 0; $i < 5; ++$i ) {
			$this->assertIsArray( ContactService::submit( $this->payload( 'rate' . $i ), '192.0.2.12' ) );
		}
		$result = ContactService::submit( $this->payload( 'blocked' ), '192.0.2.12' );
		$this->assertSame( 'rate_limited', $result->get_error_code() );
		$key = 'avenor_lock_' . hash_hmac( 'sha256', '192.0.2.13', wp_salt() );
		add_option( $key, time(), '', false );
		$this->assertSame( 'busy', ContactService::submit( $this->payload( 'busy' ), '192.0.2.13' )->get_error_code() );
		delete_option( $key );
		$fingerprint   = hash_hmac( 'sha256', strtolower( $this->payload( 'cross' )['email'] ) . '|' . $this->payload( 'cross' )['message'], wp_salt() );
		$duplicate_key = 'avenor_duplicate_lock_' . $fingerprint;
		add_option( $duplicate_key, time(), '', false );
		$this->assertSame( 'busy', ContactService::submit( $this->payload( 'cross' ), '192.0.2.14' )->get_error_code() );
		$this->assertFalse( get_option( 'avenor_lock_' . hash_hmac( 'sha256', '192.0.2.14', wp_salt() ) ) );
		delete_option( $duplicate_key );
	}
	public function test_rest_payload_limits_and_private_routes(): void {
		$request = new WP_REST_Request( 'POST', '/avenor/v1/contact' );
		$request->set_body( str_repeat( 'x', 16001 ) );
		$this->assertSame( 'payload_too_large', ContactController::handle( $request )->get_error_code() );
		$server = rest_get_server();
		$this->assertArrayHasKey( '/avenor/v1/contact', $server->get_routes() );
		$this->assertSame( 404, $server->dispatch( new WP_REST_Request( 'GET', '/wp/v2/avenor_inquiry' ) )->get_status() );
	}
	public function test_settings_meta_and_dynamic_escaping(): void {
		$clean = BusinessSettings::sanitize(
			array(
				'name'           => '<script>bad</script>Studio',
				'email'          => 'valid@example.test',
				'linkedin'       => 'javascript:alert(1)',
				'retention_days' => 99999,
			)
		);
		$this->assertSame( 'Studio', $clean['name'] );
		$this->assertSame( '', $clean['linkedin'] );
		$this->assertSame( 3650, $clean['retention_days'] );
		$id = wp_insert_post(
			array(
				'post_type'    => 'avenor_service',
				'post_status'  => 'publish',
				'post_title'   => 'Testing <img src=x onerror=alert(1)>',
				'post_excerpt' => '<script>alert(1)</script>Safe summary',
			)
		);
		update_post_meta( $id, 'avenor_related', array( -8, '7', 'bad', 7 ) );
		$this->assertSame( array( 8, 7 ), get_post_meta( $id, 'avenor_related', true ) );
		$html = BlockRegistrar::grid(
			'services-grid',
			array(
				'heading' => '<script>bad</script>',
				'count'   => 999,
				'columns' => 9,
			)
		);
		$this->assertStringNotContainsString( '<script>', $html );
		$this->assertStringContainsString( '&lt;script&gt;', $html );
		$this->assertStringContainsString( 'columns-3', $html );
		wp_delete_post( $id, true );
	}
	public function test_privacy_export_erase_and_retention(): void {
		$data = $this->payload( 'privacy' );
		ContactService::submit( $data, '192.0.2.20' );
		$export = Privacy::export( $data['email'] );
		$this->assertCount( 1, $export['data'] );
		$this->assertTrue( Privacy::erase( $data['email'] )['items_removed'] );
		$this->assertSame( array(), Privacy::export( $data['email'] )['data'] );
		$id = wp_insert_post(
			array(
				'post_type'   => 'avenor_inquiry',
				'post_status' => 'private',
				'post_title'  => 'Expired',
				'post_date'   => '2020-01-01 00:00:00',
			)
		);
		Privacy::retention();
		$this->assertNull( get_post( $id ) );
	}
	private function assertWPError( mixed $value ): void {
		$this->assertInstanceOf( WP_Error::class, $value );
	}

	public function test_only_authorized_admin_with_valid_nonce_can_change_inquiry_status(): void {
		$id = wp_insert_post(
			array(
				'post_type'   => 'avenor_inquiry',
				'post_status' => 'private',
				'post_title'  => 'Workflow security fixture',
			)
		);
		update_post_meta( $id, '_avenor_status', 'new' );
		$original = $_POST;
		try {
			wp_set_current_user( 1 );
			$_POST = array(
				'avenor_status'        => 'resolved',
				'avenor_inquiry_nonce' => 'invalid',
			);
			\Avenor\Core\Contact\InquiryAdmin::save( $id );
			$this->assertSame( 'new', get_post_meta( $id, '_avenor_status', true ) );
			$nonce = wp_create_nonce( 'avenor_inquiry' );
			wp_set_current_user( 0 );
			$_POST['avenor_inquiry_nonce'] = $nonce;
			\Avenor\Core\Contact\InquiryAdmin::save( $id );
			$this->assertSame( 'new', get_post_meta( $id, '_avenor_status', true ) );
			wp_set_current_user( 1 );
			\Avenor\Core\Contact\InquiryAdmin::save( $id );
			$this->assertSame( 'resolved', get_post_meta( $id, '_avenor_status', true ) );
		} finally {
			$_POST = $original;
			wp_set_current_user( 0 );
			wp_delete_post( $id, true );
		}
	}

	public function test_draft_service_cannot_be_selected_in_public_inquiry(): void {
		$id = wp_insert_post(
			array(
				'post_type'   => 'avenor_service',
				'post_status' => 'draft',
				'post_title'  => 'Unpublished service',
				'post_name'   => 'unpublished-service',
			)
		);
		try {
			$this->assertWPError( Validation::check( array_replace( $this->payload(), array( 'service' => 'unpublished-service' ) ) ) );
		} finally {
			wp_delete_post( $id, true );
		}
	}
}
