<?php
/** Initial business content step. @package Avenor */
defined( 'ABSPATH' ) || exit;

add_option(
	'avenor_business',
	array(
		'name'               => 'AVENOR',
		'tagline'            => 'Digital Strategy & Innovation',
		'email'              => 'hello@example.test',
		'address'            => 'An independent studio. A global perspective.',
		'notification_email' => get_option( 'admin_email' ),
		'cta_label'          => 'Start a conversation',
		'retention_days'     => 365,
	)
);
if ( ! get_option( 'avenor_seed_initialized' ) ) {
	update_option( 'blogname', 'AVENOR' );
	update_option( 'blogdescription', 'Independent digital strategy, thoughtful design, and dependable technology.' );
	update_option( 'show_on_front', 'page' );
	update_option( 'page_on_front', $avenor_front );
	update_option( 'page_for_posts', $avenor_posts );
	update_option( 'permalink_structure', '/%postname%/' );
	$avenor_navigation = '';
	foreach ( array(
		'About'     => 'about',
		'Services'  => 'services',
		'Solutions' => 'work',
		'Insights'  => 'insights',
		'Contact'   => 'contact',
	) as $avenor_label => $avenor_slug ) {
		$avenor_navigation .= '<!-- wp:navigation-link ' . wp_json_encode(
			array(
				'label' => $avenor_label,
				'url'   => home_url( '/' . $avenor_slug . '/' ),
				'kind'  => 'custom',
			)
		) . ' /-->';
	}
	avenor_seed_record( 'wp_navigation', 'avenor-main', 'AVENOR main navigation', $avenor_navigation );
	add_option( 'avenor_seed_initialized', true );
	flush_rewrite_rules();
}
