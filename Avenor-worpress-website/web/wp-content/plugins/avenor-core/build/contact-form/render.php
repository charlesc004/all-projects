<?php
/** Server block renderer. @package Avenor */
defined( 'ABSPATH' ) || exit;
echo \Avenor\Core\Blocks\BlockRegistrar::form(); // phpcs:ignore WordPress.Security.EscapeOutput -- Escaped at rendering boundary.
