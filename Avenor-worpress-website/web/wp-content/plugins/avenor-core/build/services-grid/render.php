<?php
/** Server block renderer. @package Avenor */
defined( 'ABSPATH' ) || exit;
echo \Avenor\Core\Blocks\BlockRegistrar::grid( 'services-grid', $attributes ); // phpcs:ignore WordPress.Security.EscapeOutput -- Escaped at rendering boundary.
