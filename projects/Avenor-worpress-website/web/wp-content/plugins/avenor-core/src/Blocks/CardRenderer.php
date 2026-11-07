<?php
/** Focused server-rendered block component. @package Avenor */
namespace Avenor\Core\Blocks;

defined( 'ABSPATH' ) || exit;

final class CardRenderer {
	public static function render( \WP_Post $post, string $kind, int $index, int $heading_level = 3 ): void {
		$heading_level = max( 2, min( 3, $heading_level ) );
		$id            = $post->ID;
		$title         = get_the_title( $post );
		$url           = get_permalink( $post );
		?>
		<article class="collection-card">
			<?php if ( 'services-grid' === $kind ) : ?>
				<div class="service-card-top">
					<?php ServiceIcons::render( $post->post_name ); ?>
					<span class="card-number" aria-hidden="true"><?php echo esc_html( sprintf( '%02d', $index + 1 ) ); ?></span>
				</div>
				<h<?php echo esc_attr( $heading_level ); ?> class="card-title"><a href="<?php echo esc_url( $url ); ?>"><?php echo esc_html( $title ); ?><span aria-hidden="true">↗</span></a></h<?php echo esc_attr( $heading_level ); ?>>
				<p><?php echo esc_html( get_the_excerpt( $post ) ); ?></p>
				<p class="service-category"><?php echo esc_html( implode( ' / ', wp_get_post_terms( $id, 'avenor_service_cat', array( 'fields' => 'names' ) ) ) ); ?></p>
			<?php elseif ( 'testimonials' === $kind ) : ?>
				<p class="eyebrow">Client perspective</p>
				<blockquote><p>“<?php echo esc_html( wp_strip_all_tags( $post->post_content ) ); ?>”</p><cite><?php echo esc_html( $title . ' · ' . get_post_meta( $id, 'avenor_company', true ) ); ?></cite></blockquote>
			<?php else : ?>
				<?php if ( has_post_thumbnail( $post ) ) : ?>
					<div class="card-image">
						<?php
						if ( 'case-studies-grid' === $kind ) :
							?>
							<a href="<?php echo esc_url( $url ); ?>" aria-label="<?php echo esc_attr( 'View case study: ' . $title ); ?>"><?php endif; ?>
						<?php echo get_the_post_thumbnail( $post, 'large', array( 'loading' => 'lazy' ) ); ?>
						<?php
						if ( 'case-studies-grid' === $kind ) :
							?>
							</a><?php endif; ?>
					</div>
				<?php endif; ?>
				<p class="eyebrow"><?php echo esc_html( 'team-grid' === $kind ? get_post_meta( $id, 'avenor_role', true ) : implode( ' / ', wp_get_post_terms( $id, 'avenor_industry', array( 'fields' => 'names' ) ) ) ); ?></p>
				<h<?php echo esc_attr( $heading_level ); ?> class="card-title">
				<?php
				if ( 'case-studies-grid' === $kind ) :
					?>
					<a href="<?php echo esc_url( $url ); ?>"><?php endif; ?><?php echo esc_html( $title ); ?>
					<?php
					if ( 'case-studies-grid' === $kind ) :
						?>
					<span aria-hidden="true">↗</span></a><?php endif; ?></h<?php echo esc_attr( $heading_level ); ?>>
				<p><?php echo esc_html( get_the_excerpt( $post ) ); ?></p>
				<?php
				if ( 'team-grid' === $kind && get_post_meta( $id, 'avenor_social', true ) ) :
					?>
					<a href="<?php echo esc_url( get_post_meta( $id, 'avenor_social', true ) ); ?>">Connect with <?php echo esc_html( $title ); ?></a><?php endif; ?>
			<?php endif; ?>
		</article>
		<?php
	}
}
