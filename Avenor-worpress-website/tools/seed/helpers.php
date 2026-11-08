<?php
/** Initial business content step. @package Avenor */
defined( 'ABSPATH' ) || exit;

function avenor_seed_p( string $text ): string {
	return '<!-- wp:paragraph --><p>' . esc_html( $text ) . '</p><!-- /wp:paragraph -->';
}
function avenor_seed_h( string $text, int $level = 2 ): string {
	return '<!-- wp:heading {"level":' . $level . '} --><h' . $level . ' class="wp-block-heading">' . esc_html( $text ) . '</h' . $level . '><!-- /wp:heading -->';
}
function avenor_seed_group( string $content, string $class_name = 'avenor-width section' ): string {
	return '<!-- wp:group {"className":' . wp_json_encode( $class_name ) . '} --><div class="wp-block-group ' . esc_attr( $class_name ) . '">' . $content . '</div><!-- /wp:group -->';
}
function avenor_seed_record( string $type, string $slug, string $title, string $content, string $excerpt = '', int $order = 0 ): int {
	$existing = get_page_by_path( $slug, OBJECT, $type );
	if ( $existing ) {
		return $existing->ID;
	}
	$id = wp_insert_post(
		array(
			'post_type'    => $type,
			'post_name'    => $slug,
			'post_title'   => $title,
			'post_content' => $content,
			'post_excerpt' => $excerpt,
			'post_status'  => 'avenor_inquiry' === $type ? 'private' : 'publish',
			'menu_order'   => $order,
		),
		true
	);
	if ( is_wp_error( $id ) ) {
		throw new RuntimeException( $id->get_error_message() );
	}
	return $id;
}
function avenor_seed_pattern( string $name ): string {
	$file = get_theme_file_path( 'patterns/' . $name . '.php' );
	if ( ! is_readable( $file ) ) {
		throw new RuntimeException( 'Activate the AVENOR theme before seeding.' );
	}
	ob_start();
	include $file;
	return ob_get_clean();
}
function avenor_seed_image( int $id, string $name, string $alt, string $extension = 'jpg' ): void {
	if ( has_post_thumbnail( $id ) ) {
		return;
	}
	$existing = get_posts(
		array(
			'post_type'      => 'attachment',
			'post_status'    => 'inherit',
			'name'           => 'avenor-' . $name,
			'posts_per_page' => 1,
		)
	);
	if ( $existing ) {
		set_post_thumbnail( $id, $existing[0]->ID );
		return;
	}
	$file = get_theme_file_path( 'assets/images/' . $name . '.' . $extension );
	if ( ! is_readable( $file ) ) {
		return;
	}
	$upload = wp_upload_bits( 'avenor-' . $name . '.' . $extension, null, file_get_contents( $file ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local supplied asset.
	if ( $upload['error'] ) {
		throw new RuntimeException( $upload['error'] );
	}
	$attachment = wp_insert_attachment(
		array(
			'post_title'     => 'AVENOR ' . $name,
			'post_name'      => 'avenor-' . $name,
			'post_mime_type' => 'png' === $extension ? 'image/png' : 'image/jpeg',
			'post_status'    => 'inherit',
		),
		$upload['file']
	);
	require_once ABSPATH . 'wp-admin/includes/image.php';
	wp_update_attachment_metadata( $attachment, wp_generate_attachment_metadata( $attachment, $upload['file'] ) );
	update_post_meta( $attachment, '_wp_attachment_image_alt', $alt );
	set_post_thumbnail( $id, $attachment );
}
