<?php
/** Focused server-rendered block component. @package Avenor */
namespace Avenor\Core\Blocks;

defined( 'ABSPATH' ) || exit;

final class ServiceIcons {
	public static function render( string $slug ): void {
		$paths = array(
			'digital-strategy'     => '<circle cx="20" cy="20" r="12"/><path d="m24 16-2 6-6 2 2-6zM20 4v4M20 32v4M4 20h4M32 20h4"/>',
			'web-development'      => '<rect x="6" y="8" width="28" height="25" rx="3"/><path d="M6 15h28M16 20l-4 4 4 4M24 20l4 4-4 4M11 11.5h1M15 11.5h1"/>',
			'product-design'       => '<circle cx="26" cy="14" r="7"/><rect x="7" y="19" width="15" height="15" rx="2"/><path d="M8 7h7M11.5 3.5v7M28 28l5 5M33 28l-5 5"/>',
			'e-commerce-solutions' => '<path d="M9 14h22l2 20H7zM15 16V10a5 5 0 0 1 10 0v6M15 24a5 5 0 0 0 10 0"/>',
			'business-automation'  => '<circle cx="9" cy="10" r="4"/><circle cx="31" cy="10" r="4"/><circle cx="20" cy="31" r="4"/><path d="M13 10h14M9 14v9h7M31 14v9H20v4M20 19v-5M17 17l3-3 3 3"/>',
			'technical-consulting' => '<path d="M7 7h26v20H20l-8 7v-7H7zM13 14h14M13 20h9"/>',
		);
		echo '<svg class="service-icon" viewBox="0 0 40 40" fill="none" aria-hidden="true" focusable="false">' . ( $paths[ $slug ] ?? $paths['technical-consulting'] ) . '</svg>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Fixed SVG literals from a private whitelist.
	}
}
