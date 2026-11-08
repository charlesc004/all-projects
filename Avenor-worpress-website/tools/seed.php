<?php
/** Idempotent business initialization with versioned presentation migration. @package Avenor */
defined( 'ABSPATH' ) || exit;

require __DIR__ . '/seed/helpers.php';
require __DIR__ . '/seed/compositions.php';
require __DIR__ . '/seed/pages.php';
require __DIR__ . '/seed/services.php';
require __DIR__ . '/seed/solutions.php';
require __DIR__ . '/seed/insights.php';
require __DIR__ . '/seed/settings.php';
require __DIR__ . '/seed/project.php';
require __DIR__ . '/signal-redesign.php';

echo "AVENOR content ready. Existing business records were preserved.\n";
