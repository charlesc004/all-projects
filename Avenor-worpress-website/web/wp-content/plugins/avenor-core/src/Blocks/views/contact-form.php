<?php
/** Accessible contact form view. @package Avenor */
use Avenor\Core\Contact\Validation;
defined( 'ABSPATH' ) || exit;
?>
		<form <?php echo get_block_wrapper_attributes( array( 'class' => 'avenor-contact-form' ) ); // phpcs:ignore WordPress.Security.EscapeOutput ?> action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post" data-endpoint="<?php echo esc_url( rest_url( 'avenor/v1/contact' ) ); ?>">
			<input type="hidden" name="action" value="avenor_contact">
			<div class="form-row">
				<label for="<?php echo esc_attr( $uid ); ?>name">Full name <span>(required)</span><input id="<?php echo esc_attr( $uid ); ?>name" name="name" autocomplete="name" required minlength="<?php echo esc_attr( Validation::MIN_LENGTH['name'] ); ?>" maxlength="<?php echo esc_attr( Validation::LIMITS['name'] ); ?>" placeholder="Your full name"></label>
				<label for="<?php echo esc_attr( $uid ); ?>email">Email <span>(required)</span><input id="<?php echo esc_attr( $uid ); ?>email" name="email" type="email" autocomplete="email" required maxlength="<?php echo esc_attr( Validation::LIMITS['email'] ); ?>" placeholder="you@company.com"></label>
			</div>
			<div class="form-row">
				<label for="<?php echo esc_attr( $uid ); ?>company">Company <span>(optional)</span><input id="<?php echo esc_attr( $uid ); ?>company" name="company" autocomplete="organization" maxlength="<?php echo esc_attr( Validation::LIMITS['company'] ); ?>" placeholder="Your company"></label>
				<label for="<?php echo esc_attr( $uid ); ?>service">I’m interested in <span>(optional)</span><select id="<?php echo esc_attr( $uid ); ?>service" name="service"><option value="">Let’s explore</option>
				<?php
				foreach ( $services as $service ) :
					?>
					<option value="<?php echo esc_attr( $service->post_name ); ?>"><?php echo esc_html( $service->post_title ); ?></option>
				<?php endforeach; ?>
				</select></label>
			</div>
			<label for="<?php echo esc_attr( $uid ); ?>message">Tell us a little about your project <span>(required)</span><textarea id="<?php echo esc_attr( $uid ); ?>message" name="message" required minlength="<?php echo esc_attr( Validation::MIN_LENGTH['message'] ); ?>" maxlength="<?php echo esc_attr( Validation::LIMITS['message'] ); ?>" rows="5" placeholder="The challenge, the ambition, and where you’d like to go."></textarea></label>
			<div class="honeypot" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label></div>
			<label class="privacy-check"><input type="checkbox" name="privacy" value="1" required> <span>I acknowledge the <a href="<?php echo esc_url( $privacy_url ); ?>">privacy notice</a> and the use of my details to respond to this inquiry.</span></label>
			<button class="wp-element-button" type="submit">Send inquiry <span aria-hidden="true">↗</span></button>
			<p class="form-status" role="status" aria-live="polite" tabindex="-1"><?php echo esc_html( $feedback ); ?></p>
		</form>
