<?php
/** One composition map for initialization and the versioned redesign. @package Avenor */
defined( 'ABSPATH' ) || exit;

function avenor_signal_page( string $slug ): string {
	$compositions = array(
		'home'    => array( 'hero', 'services-overview', 'portfolio', 'insights-preview', 'faq', 'contact-cta' ),
		'about'   => array( 'studio-intro', 'practice', 'process-section', 'standards', 'contact-cta' ),
		'contact' => array( 'contact-entry' ),
	);
	return implode( '', array_map( 'avenor_seed_pattern', $compositions[ $slug ] ?? array() ) );
}
