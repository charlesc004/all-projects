import { createAnimationScope } from '@avenor/animation';
import { headline } from '@avenor/headline';

export function initReveals( main, preference ) {
	const played = new WeakSet();
	const scope = createAnimationScope();
	const active = scope.active;
	let observer;
	const animate = ( element, frames, delay = 0, duration = 900 ) =>
		scope.animate( element, frames, { delay, duration } );
	function enter( element, delay = 0 ) {
		if ( played.has( element ) || preference.matches ) {
			return;
		}
		played.add( element );
		element.dataset.motionEntered = 'true';
		if (
			element.matches( '.hero h1, .page-intro h1' ) &&
			element.textContent.length < 160
		) {
			headline( element, delay, animate );
			return;
		}
		// Keep click targets still; animate their clipped imagery rather than hit boxes.
		const interactive =
			element.matches(
				'a, button, input, select, textarea, summary, [tabindex]'
			) ||
			element.querySelector(
				'a, button, input, select, textarea, summary, [tabindex]'
			);
		const frames = interactive
			? [ { opacity: 0 }, { opacity: 1 } ]
			: [
					{
						opacity: 0,
						transform: 'translate3d(0, 48px, 0) scale(.97)',
					},
					{ opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
				];
		animate( element, frames, delay );
		const image = element.querySelector(
			'.card-image img, .wp-block-post-featured-image img'
		);
		if ( image ) {
			animate(
				image,
				[ { transform: 'scale(1.13)' }, { transform: 'scale(1)' } ],
				delay,
				1100
			);
		}
		if ( element.matches( '.hero-visual' ) ) {
			const heroImage = element.querySelector( '.hero-image' );
			if ( heroImage ) {
				animate(
					heroImage,
					[
						{ clipPath: 'inset(12% 0 12% 0 round 10px)' },
						{ clipPath: 'inset(0 0 0 0 round 10px)' },
					],
					delay,
					1100
				);
			}
		}
	}
	function configure() {
		observer?.disconnect();
		scope.stop();
		document.documentElement.dataset.avenorMotion = preference.matches
			? 'reduced'
			: 'full';
		if ( preference.matches ) {
			return;
		}
		main.querySelectorAll(
			'.hero .eyebrow, .hero h1, .hero-description, .hero-visual, .page-intro > .eyebrow, .page-intro h1, .page-intro > p:not(.eyebrow)'
		).forEach( ( element, index ) =>
			enter( element, Math.min( index, 3 ) * 100 )
		);
		observer = new window.IntersectionObserver(
			( entries ) => {
				let stagger = 0;
				entries.forEach( ( entry ) => {
					if ( ! entry.isIntersecting ) {
						return;
					}
					// Keyboard focus never waits for a decorative reveal.
					if (
						! entry.target.contains(
							entry.target.ownerDocument.activeElement
						)
					) {
						enter( entry.target, Math.min( stagger++, 3 ) * 100 );
					}
					observer.unobserve( entry.target );
				} );
			},
			{ threshold: 0.08, rootMargin: '0px 0px -24px 0px' }
		);
		main.querySelectorAll(
			'.section h2, .collection-card, .wp-block-post, .expertise-card, .partnership-card, .standard-card, .industry-card, .process-step, .contact-cta-inner, .faq-list details'
		).forEach( ( element ) => {
			const callToAction = element.closest( '.contact-cta-inner' );
			if (
				! played.has( element ) &&
				( ! callToAction || callToAction === element )
			) {
				observer.observe( element );
			}
		} );
	}
	main.addEventListener( 'focusin', ( event ) => {
		active.forEach( ( animation ) => {
			if (
				animation.effect.target.contains( event.target ) ||
				event.target.contains( animation.effect.target )
			) {
				animation.cancel();
			}
		} );
	} );
	window.addEventListener( 'pageshow', ( event ) => {
		if ( event.persisted ) {
			configure();
		}
	} );
	preference.addEventListener( 'change', configure );
	configure();
}
