<?php
/** Preserve business records on uninstall; delete explicitly in WordPress. @package Avenor */
defined( 'WP_UNINSTALL_PLUGIN' ) || exit;
wp_clear_scheduled_hook( 'avenor_daily_retention' );
foreach ( array( 'edit_inquiries', 'edit_others_inquiries', 'edit_private_inquiries', 'edit_published_inquiries', 'publish_inquiries', 'read_private_inquiries', 'delete_inquiries', 'delete_others_inquiries', 'delete_private_inquiries', 'delete_published_inquiries' ) as $avenor_capability ) {
	get_role( 'administrator' )?->remove_cap( $avenor_capability );
}
