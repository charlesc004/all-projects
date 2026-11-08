<?php
/** Editorial sections and the studio's own implemented platform. @package Avenor */
defined( 'ABSPATH' ) || exit;

$avenor_platform_copy = avenor_seed_p( 'An in-house project: the digital platform you are using now. Strategy, experience design, and WordPress engineering come together in one publishing system.' )
	. avenor_seed_h( 'The brief' ) . avenor_seed_p( 'Make services easy to understand, connect solution architecture to practical delivery, and give editors direct control over the website without a separate page builder.' )
	. avenor_seed_h( 'Scope of work' ) . avenor_seed_p( 'A custom WordPress block theme, a dark responsive design system, reusable editorial patterns, structured service and solution collections, and a companion plugin for business content and inquiries.' )
	. avenor_seed_h( 'Experience and publishing' ) . avenor_seed_p( 'Native blocks support page editing. Structured collections connect services, industries, and related content. The mobile navigation provides a focused menu, keyboard controls, and a direct path to the contact form.' )
	. avenor_seed_h( 'Inquiry workflow' ) . avenor_seed_p( 'The contact form validates submissions, stores inquiries privately, and supports an administrative workflow. Native HTML submission works when JavaScript is unavailable. Email notifications depend on the delivery configuration of the hosting environment.' )
	. avenor_seed_h( 'Acceptance criteria' ) . avenor_seed_p( 'Visitors can explore services and solution details, use the mobile menu with a keyboard, and submit an inquiry. Editors can update pages using native blocks and manage structured business content. Inquiry records remain outside public search and content APIs.' )
	. avenor_seed_h( 'Project context' ) . avenor_seed_p( 'Client: AVENOR. Project type: in-house website and publishing platform. This case study describes the implementation itself; it makes no claims about external client results or commercial performance.' );
$avenor_platform_id   = avenor_seed_record( 'avenor_case', 'avenor-platform', 'AVENOR — A connected digital platform', $avenor_platform_copy, 'Our own website brings a custom dark interface, native WordPress publishing, and a private inquiry workflow into one connected platform.' );
update_post_meta( $avenor_platform_id, 'avenor_entry_kind', 'project' );
avenor_seed_image( $avenor_platform_id, 'avenor-platform', 'AVENOR website: dark interface with electric chartreuse typography and a geometric signal', 'png' );
