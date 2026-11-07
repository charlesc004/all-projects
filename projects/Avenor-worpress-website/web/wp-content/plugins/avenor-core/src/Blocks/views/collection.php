<?php
/** Escaped collection view. @package Avenor */
defined( 'ABSPATH' ) || exit;
?>
		<div <?php echo get_block_wrapper_attributes( array( 'class' => 'avenor-collection ' . $kind . ( 'avenor_case' === $type && 'project' === $content_kind ? ' portfolio-grid' : '' ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput -- Core escaped attributes. ?>>
			<?php if ( ! empty( $attributes['heading'] ) ) : ?>
				<h2><?php echo esc_html( $attributes['heading'] ); ?></h2>
			<?php endif; ?>
			<?php if ( $archive && taxonomy_exists( $taxonomy ) ) : ?>
				<nav class="collection-filters" aria-label="Filter <?php echo esc_attr( 'avenor_case' === $type ? 'work by industry' : 'services by category' ); ?>">
					<a href="<?php echo esc_url( get_post_type_archive_link( $type ) ); ?>" <?php echo ! $category ? 'aria-current="page"' : ''; ?>>All <?php echo 'avenor_case' === $type ? 'solutions' : 'services'; ?></a>
					<?php
					foreach ( $terms as $term ) :
						?>
						<a href="<?php echo esc_url( get_term_link( $term ) ); ?>" <?php echo $category === $term->term_id ? 'aria-current="page"' : ''; ?>><?php echo esc_html( $term->name ); ?></a>
					<?php endforeach; ?>
				</nav>
			<?php endif; ?>
			<div class="collection-grid columns-<?php echo esc_attr( $columns ); ?>">
				<?php
				foreach ( $query->posts as $index => $post ) {
					\Avenor\Core\Blocks\CardRenderer::render( $post, $kind, $index, $heading_level );
				}
				if ( ! $query->have_posts() ) {
					if ( in_array( $kind, array( 'team-grid', 'testimonials' ), true ) ) {
						$intro = 'team-grid' === $kind ? 'The right expertise, around one clear brief.' : 'Good partnerships begin with a clear conversation.';
						$copy  = 'team-grid' === $kind ? 'Tell us about your challenge and we’ll discuss the expertise your project needs.' : 'Discuss your priorities, the way you work, and what a successful collaboration should look like.';
						echo '<div class="collection-introduction"><h3>' . esc_html( $intro ) . '</h3><p>' . esc_html( $copy ) . '</p><a class="text-link" href="' . esc_url( home_url( '/contact/' ) ) . '">Talk to the studio ↗</a></div>';
					} else {
						echo '<p>No entries in this collection yet. Please check back soon.</p>';
					}
				}
				?>
			</div>
			<?php if ( $archive ) : ?>
				<nav class="pagination" aria-label="Collection pages">
				<?php
				echo wp_kses_post(
					paginate_links(
						array(
							'total'   => $query->max_num_pages,
							'current' => $args['paged'],
						)
					)
				);
				?>
				</nav>
			<?php endif; ?>
		</div>
