export function initScrollMotion( main, preference, pointer ) {
	const hero = main.querySelector( '.hero-visual' );
	const progress = document.createElement( 'div' );
	progress.className = 'avenor-scroll-progress';
	progress.setAttribute( 'aria-hidden', 'true' );
	document.body.append( progress );
	let scrollFrame = 0;
	function updateScroll() {
		scrollFrame = 0;
		if ( preference.matches ) {
			return;
		}
		const range =
			document.documentElement.scrollHeight - window.innerHeight;
		const fraction =
			range > 0
				? Math.max( 0, Math.min( 1, window.scrollY / range ) )
				: 0;
		progress.style.setProperty( '--avenor-progress', fraction );
		if ( hero && pointer.matches ) {
			const bounds = hero.getBoundingClientRect();
			if ( bounds.bottom > 0 && bounds.top < window.innerHeight ) {
				const limit = Math.min( 24, bounds.height * 0.05 );
				const shift = Math.max(
					-limit,
					Math.min( limit, -bounds.top * 0.065 )
				);
				hero.style.setProperty(
					'--avenor-image-shift',
					`${ shift }px`
				);
			}
		}
	}
	function scheduleScroll() {
		if ( ! scrollFrame && ! preference.matches ) {
			scrollFrame = window.requestAnimationFrame( updateScroll );
		}
	}

	function configure() {
		window.cancelAnimationFrame( scrollFrame );
		scrollFrame = 0;
		progress.hidden = preference.matches;
		scheduleScroll();
	}
	window.addEventListener( 'scroll', scheduleScroll, { passive: true } );
	window.addEventListener( 'resize', scheduleScroll, { passive: true } );
	preference.addEventListener( 'change', configure );
	configure();
}
