#!/usr/bin/env sh
set -eu
attempt=0
until [ -f wp-load.php ] && [ -f wp-config.php ]; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 60 ]; then
    echo "WordPress files are not ready. Check docker compose logs wordpress." >&2
    exit 1
  fi
  sleep 1
done
wp core install --url="http://localhost:${WORDPRESS_PORT:-8080}" --title=AVENOR --admin_user="$WP_ADMIN_USER" --admin_password="$WP_ADMIN_PASSWORD" --admin_email="$WP_ADMIN_EMAIL" --skip-email
wp plugin activate avenor-core
wp theme activate avenor
wp rewrite structure '/%postname%/' --hard
wp eval-file avenor-tools/seed.php
