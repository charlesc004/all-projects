<?php
/** Focused server-rendered block component. @package Avenor */
namespace Avenor\Core\Blocks;
use Avenor\Core\Contact\ContactService;

defined( 'ABSPATH' ) || exit;

final class ContactForm {
	public static function render(): string {
		wp_enqueue_script( 'avenor-contact' );
		$uid         = wp_unique_id( 'avenor-contact-' );
		$status      = isset( $_GET['inquiry'] ) ? sanitize_key( wp_unslash( $_GET['inquiry'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Public feedback state only.
		$messages    = array(
			'sent'         => ContactService::SUCCESS_MESSAGE,
			'rate_limited' => 'We have received several inquiries from your network. Please try again in an hour, or contact us by email.',
			'busy'         => 'Another inquiry is being processed. Please retry shortly; duplicate inquiries are prevented.',
		);
		$feedback    = $status ? ( $messages[ $status ] ?? 'We could not accept this inquiry. Check the fields or try again later.' ) : '';
		$privacy_url = get_privacy_policy_url() ? get_privacy_policy_url() : home_url( '/privacy/' );
		$services    = get_posts(
			array(
				'post_type'      => 'avenor_service',
				'posts_per_page' => 50,
				'orderby'        => 'menu_order',
				'order'          => 'ASC',
			)
		);
		ob_start();
		require __DIR__ . '/views/contact-form.php';
		return ob_get_clean();
	}
}
