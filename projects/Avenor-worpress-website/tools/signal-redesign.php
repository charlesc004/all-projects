<?php
/** Apply the approved Signal redesign once, retaining page revisions. @package Avenor */
defined( 'ABSPATH' ) || exit;

if ( get_option( 'avenor_signal_design_version' ) ) {
	return;
}
foreach ( array( 'home', 'about', 'contact' ) as $avenor_slug ) {
	$avenor_page = get_page_by_path( $avenor_slug );
	if ( $avenor_page ) {
		wp_save_post_revision( $avenor_page->ID );
		wp_update_post(
			array(
				'ID'           => $avenor_page->ID,
				'post_content' => avenor_signal_page( $avenor_slug ),
			)
		);
	}
}
$avenor_nav = get_page_by_path( 'avenor-main', OBJECT, 'wp_navigation' );
if ( $avenor_nav ) {
	$avenor_links = '';
	foreach ( array(
		'Services'  => 'services',
		'Solutions' => 'work',
		'About'     => 'about',
		'Insights'  => 'insights',
		'Contact'   => 'contact',
	) as $avenor_label => $avenor_slug ) {
		$avenor_links .= '<!-- wp:navigation-link ' . wp_json_encode(
			array(
				'label' => $avenor_label,
				'url'   => home_url( '/' . $avenor_slug . '/' ),
				'kind'  => 'custom',
			)
		) . ' /-->';
	}
	wp_save_post_revision( $avenor_nav->ID );
	wp_update_post(
		array(
			'ID'           => $avenor_nav->ID,
			'post_content' => $avenor_links,
		)
	);
}
update_option( 'avenor_signal_design_version', '1', false );
echo "AVENOR Signal design applied. Subsequent editorial edits will be preserved.\n";
