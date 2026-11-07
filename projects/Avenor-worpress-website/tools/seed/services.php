<?php
/** Initial business content step. @package Avenor */
defined( 'ABSPATH' ) || exit;

$avenor_services    = array(
	array( 'Digital Strategy', 'Find the right direction before taking the next step.', 'Strategy', 'We combine customer research, business analysis, and practical technology assessment to establish a shared direction.', 'Customer interviews, opportunity mapping, digital roadmaps, and measurable priorities.' ),
	array( 'Web Development', 'Dependable digital foundations, built with care.', 'Technology', 'We build accessible, maintainable experiences with clear content models and considered performance budgets.', 'Custom WordPress platforms, integrations, responsive development, and performance engineering.' ),
	array( 'Product Design', 'Thoughtful experiences that make complex things feel simple.', 'Design', 'We translate real human needs into clear digital experiences. Research and prototyping bring teams into the conversation early.', 'Experience research, information architecture, interaction design, and reusable design systems.' ),
	array( 'E-Commerce Solutions', 'Commerce experiences that earn confidence at every step.', 'Technology', 'From discovery to checkout, we remove friction while keeping the operational realities of your business in view.', 'Storefront design, catalog planning, checkout usability, and order-system integration.' ),
	array( 'Business Automation', 'Give your people more space for the work that matters.', 'Technology', 'We map work, identify unnecessary handoffs, and introduce sensible automation your team can understand and maintain.', 'Workflow discovery, system integrations, reporting pipelines, and operational documentation.' ),
	array( 'Technical Consulting', 'Independent expertise for confident technical decisions.', 'Strategy', 'Technology decisions have long consequences. We give teams a clear view of constraints, tradeoffs, and a practical path forward.', 'Architecture reviews, platform evaluation, technical due diligence, and delivery planning.' ),
);
$avenor_service_ids = array();
foreach ( $avenor_services as $avenor_index => $avenor_service ) {
	[ $avenor_name, $avenor_excerpt, $avenor_category, $avenor_copy, $avenor_capabilities ] = $avenor_service;
	$avenor_content       = avenor_seed_h( 'A clearer approach' ) . avenor_seed_p( $avenor_copy ) . avenor_seed_h( 'What we can help with' ) . avenor_seed_p( $avenor_capabilities ) . avenor_seed_h( 'Built around your business' ) . avenor_seed_p( 'We establish a shared brief, surface assumptions early, and agree on evidence that will guide decisions. You gain documented priorities, a practical plan, and a team that understands how to move forward.' ) . avenor_seed_h( 'From discovery to delivery' ) . avenor_seed_p( 'Discover the challenge. Define the direction. Prototype the approach. Deliver and learn. Every engagement is scoped around a real need, with clear ownership and regular reviews.' );
	$avenor_id            = avenor_seed_record( 'avenor_service', sanitize_title( $avenor_name ), $avenor_name, $avenor_content, $avenor_excerpt, $avenor_index );
	$avenor_service_ids[] = $avenor_id;
	if ( ! metadata_exists( 'post', $avenor_id, 'avenor_featured' ) ) {
		update_post_meta( $avenor_id, 'avenor_featured', true );
	}
	if ( ! has_term( '', 'avenor_service_cat', $avenor_id ) ) {
		wp_set_object_terms( $avenor_id, $avenor_category, 'avenor_service_cat' );
	}
}
