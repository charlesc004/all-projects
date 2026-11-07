<?php
/** Initial pages built from reusable native block patterns. @package Avenor */
defined( 'ABSPATH' ) || exit;

if ( ! post_type_exists( 'avenor_service' ) ) {
	throw new RuntimeException( 'Activate avenor-core before seeding.' );
}
$avenor_front = avenor_seed_record( 'page', 'home', 'Home', avenor_signal_page( 'home' ), 'Strategy, design and engineering for your next move.' );
$avenor_posts = avenor_seed_record( 'page', 'insights', 'Insights', '', 'Field notes on digital business.' );
avenor_seed_record( 'page', 'about', 'About', avenor_signal_page( 'about' ), 'An independent practice. A connected approach.' );
avenor_seed_record( 'page', 'contact', 'Contact', avenor_signal_page( 'contact' ), 'Tell us about your next move.' );
$avenor_privacy    = avenor_seed_group( avenor_seed_h( 'Privacy, in plain language.', 1 ) . avenor_seed_p( 'This notice explains how AVENOR handles information submitted through this website. Please do not include sensitive or confidential information in an initial inquiry.' ) . avenor_seed_h( 'Information we collect' ) . avenor_seed_p( 'The form stores your name, email, optional company and service, message, acknowledgment time, workflow status, and notification delivery flag. Only administrators have inquiry capabilities by default. Your network address is hashed with a site secret for temporary abuse controls, rather than saved on your inquiry.' ) . avenor_seed_h( 'Retention and deletion' ) . avenor_seed_p( 'Default inquiry retention is 365 days, configurable by the administrator. Daily WordPress scheduled tasks permanently delete up to 100 expired inquiries per run. Administrators can delete inquiries earlier. WordPress personal-data export and erasure tools include inquiries matched by email. Backups have separate retention policies.' ) . avenor_seed_h( 'Notifications and your choices' ) . avenor_seed_p( 'An email notification contains an administration link rather than your message. Delivery depends on mail configuration. Contact the site administrator at hello@example.test to discuss access, correction, or deletion. Use the contact form to request access, correction, or deletion of your information.' ), 'avenor-width article-shell' );
$avenor_privacy_id = avenor_seed_record( 'page', 'privacy', 'Privacy', $avenor_privacy );
if ( ! get_option( 'wp_page_for_privacy_policy' ) ) {
	update_option( 'wp_page_for_privacy_policy', $avenor_privacy_id );
}
