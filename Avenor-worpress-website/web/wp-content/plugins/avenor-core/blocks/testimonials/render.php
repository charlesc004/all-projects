<?php
/** Server block renderer. @package Avenor */
defined( 'ABSPATH' ) || exit;
echo \Avenor\Core\Blocks\BlockRegistrar::grid( 'testimonials', $attributes ); // phpcs:ignore WordPress.Security.EscapeOutput -- Escaped at rendering boundary.
