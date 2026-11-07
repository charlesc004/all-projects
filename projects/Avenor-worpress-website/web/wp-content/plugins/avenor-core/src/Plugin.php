<?php
/** Plugin composition root. @package Avenor */
namespace Avenor\Core;

defined( 'ABSPATH' ) || exit;

final class Plugin {
	public static function boot( string $file ): void {
		add_action( 'init', array( Content\Models::class, 'register' ) );
		add_action( 'init', static fn() => Blocks\BlockRegistrar::register( $file ) );
		Contact\InquiryAdmin::boot();
		Contact\ContactController::boot();
		Contact\Privacy::boot();
		Settings\BusinessSettings::boot();
		add_action( 'rest_api_init', array( Contact\ContactController::class, 'register' ) );
		add_action( 'avenor_daily_retention', array( Contact\Privacy::class, 'retention' ) );
		add_action(
			'init',
			static function () {
				if ( ! wp_next_scheduled( 'avenor_daily_retention' ) ) {
					wp_schedule_event( time(), 'daily', 'avenor_daily_retention' );
				}
			}
		);
	}

	public static function activate(): void {
		Content\Models::register();
		$admin = get_role( 'administrator' );
		foreach ( array( 'edit_inquiries', 'edit_others_inquiries', 'edit_private_inquiries', 'edit_published_inquiries', 'publish_inquiries', 'read_private_inquiries', 'delete_inquiries', 'delete_others_inquiries', 'delete_private_inquiries', 'delete_published_inquiries' ) as $capability ) {
			$admin?->add_cap( $capability );
		}
		flush_rewrite_rules();
	}
}
