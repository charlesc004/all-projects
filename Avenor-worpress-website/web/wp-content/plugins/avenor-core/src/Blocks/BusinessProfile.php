<?php
/** Focused server-rendered block component. @package Avenor */
namespace Avenor\Core\Blocks;

defined( 'ABSPATH' ) || exit;

final class BusinessProfile {
	public static function render(): string {
		$s = get_option( 'avenor_business', array() );
		ob_start();
		?>
		<div <?php echo get_block_wrapper_attributes( array( 'class' => 'business-profile' ) ); // phpcs:ignore WordPress.Security.EscapeOutput ?>>
			<p class="profile-name"><?php echo esc_html( ( $s['name'] ?? 'AVENOR' ) . ' · ' . ( $s['tagline'] ?? 'Digital Strategy & Innovation' ) ); ?></p>
			<a href="mailto:<?php echo esc_attr( $s['email'] ?? 'hello@example.test' ); ?>"><?php echo esc_html( $s['email'] ?? 'hello@example.test' ); ?></a>
			<?php
			if ( ! empty( $s['phone'] ) ) :
				?>
				<p><?php echo esc_html( $s['phone'] ); ?></p><?php endif; ?>
			<?php
			if ( ! empty( $s['address'] ) ) :
				?>
				<p><?php echo esc_html( $s['address'] ); ?></p><?php endif; ?>
			<?php
			foreach ( array(
				'linkedin'  => 'LinkedIn',
				'instagram' => 'Instagram',
			) as $key => $label ) :
				?>
				<?php
				if ( ! empty( $s[ $key ] ) ) :
					?>
					<a href="<?php echo esc_url( $s[ $key ] ); ?>"><?php echo esc_html( $label ); ?> ↗</a><?php endif; ?>
			<?php endforeach; ?>
			<p><a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>"><?php echo esc_html( $s['cta_label'] ?? 'Start a conversation' ); ?> ↗</a></p>
		</div>
		<?php
		return ob_get_clean();
	}
}
