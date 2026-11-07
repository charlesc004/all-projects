<?php
/** Business content and editable metadata. @package Avenor */
namespace Avenor\Core\Content;

defined( 'ABSPATH' ) || exit;

final class Models {
	public const TYPES = array(
		'avenor_service'     => array( 'Services', 'Service', 'services', 'dashicons-lightbulb' ),
		'avenor_case'        => array( 'Solutions', 'Solution', 'work', 'dashicons-portfolio' ),
		'avenor_team'        => array( 'Team', 'Team member', 'team', 'dashicons-groups' ),
		'avenor_testimonial' => array( 'Testimonials', 'Testimonial', 'testimonials', 'dashicons-format-quote' ),
	);

	public static function register(): void {
		foreach ( self::TYPES as $type => $config ) {
			register_post_type(
				$type,
				array(
					'labels'       => array(
						'name'          => $config[0],
						'singular_name' => $config[1],
						'add_new_item'  => 'Add ' . $config[1],
					),
					'public'       => true,
					'show_in_rest' => true,
					'has_archive'  => in_array( $type, array( 'avenor_service', 'avenor_case' ), true ),
					'rewrite'      => array(
						'slug'       => $config[2],
						'with_front' => false,
					),
					'menu_icon'    => $config[3],
					'supports'     => array( 'title', 'editor', 'excerpt', 'thumbnail', 'revisions', 'page-attributes', 'custom-fields' ),
				)
			);
		}
		register_taxonomy(
			'avenor_service_cat',
			'avenor_service',
			array(
				'label'        => 'Service categories',
				'public'       => true,
				'show_in_rest' => true,
				'hierarchical' => true,
				'rewrite'      => array( 'slug' => 'expertise' ),
			)
		);
		register_taxonomy(
			'avenor_industry',
			'avenor_case',
			array(
				'label'        => 'Industries',
				'public'       => true,
				'show_in_rest' => true,
				'hierarchical' => true,
				'rewrite'      => array( 'slug' => 'industry' ),
			)
		);
		register_post_type(
			'avenor_inquiry',
			array(
				'labels'              => array(
					'name'          => 'Inquiries',
					'singular_name' => 'Inquiry',
				),
				'public'              => false,
				'publicly_queryable'  => false,
				'exclude_from_search' => true,
				'show_ui'             => true,
				'show_in_rest'        => false,
				'rewrite'             => false,
				'menu_icon'           => 'dashicons-email-alt',
				'supports'            => array( 'title' ),
				'capability_type'     => array( 'inquiry', 'inquiries' ),
				'map_meta_cap'        => true,
				'capabilities'        => array( 'create_posts' => 'do_not_allow' ),
			)
		);
		foreach ( array_keys( self::TYPES ) as $type ) {
			self::meta( $type, 'avenor_featured', 'boolean', 'rest_sanitize_boolean', false );
			self::meta( $type, 'avenor_role', 'string', 'sanitize_text_field', '' );
			self::meta( $type, 'avenor_company', 'string', 'sanitize_text_field', '' );
			self::meta( $type, 'avenor_social', 'string', 'esc_url_raw', '' );
		}
		foreach ( array( 'avenor_case', 'avenor_service' ) as $type ) {
			register_post_meta(
				$type,
				'avenor_related',
				array(
					'type'              => 'array',
					'single'            => true,
					'default'           => array(),
					'show_in_rest'      => array(
						'schema' => array(
							'type'  => 'array',
							'items' => array( 'type' => 'integer' ),
						),
					),
					'sanitize_callback' => static fn( $value ) => array_values( array_unique( array_filter( array_map( 'absint', (array) $value ) ) ) ),
					'auth_callback'     => static fn( $allowed, $key, $id ) => current_user_can( 'edit_post', $id ),
				)
			);
		}
		self::meta( 'avenor_case', 'avenor_entry_kind', 'string', static fn( $value ) => in_array( $value, array( 'architecture', 'project' ), true ) ? $value : 'architecture', 'architecture' );
	}

	private static function meta( string $type, string $key, string $format, callable $sanitize, mixed $default_value ): void {
		register_post_meta(
			$type,
			$key,
			array(
				'type'              => $format,
				'single'            => true,
				'show_in_rest'      => true,
				'default'           => $default_value,
				'sanitize_callback' => $sanitize,
				'auth_callback'     => static fn( $allowed, $meta_key, $id ) => current_user_can( 'edit_post', $id ),
			)
		);
	}
}
