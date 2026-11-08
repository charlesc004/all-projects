export function initPointerFeedback( preference, pointer ) {
	let pointerFrame = 0;
	let pointerTarget;
	let pointerX = 0;
	let pointerY = 0;
	function updatePointer() {
		pointerFrame = 0;
		if ( ! pointerTarget || preference.matches || ! pointer.matches ) {
			return;
		}
		const bounds = pointerTarget.getBoundingClientRect();
		const x = pointerX - bounds.left;
		const y = pointerY - bounds.top;
		pointerTarget.style.setProperty( '--avenor-pointer-x', `${ x }px` );
		pointerTarget.style.setProperty( '--avenor-pointer-y', `${ y }px` );
		pointerTarget.style.setProperty(
			'--avenor-magnet-x',
			`${ ( x / bounds.width - 0.5 ) * 6 }px`
		);
		pointerTarget.style.setProperty(
			'--avenor-magnet-y',
			`${ ( y / bounds.height - 0.5 ) * 6 }px`
		);
	}
	document
		.querySelectorAll(
			'.wp-block-button__link, .services-grid .collection-card'
		)
		.forEach( ( element ) => {
			element.addEventListener(
				'pointermove',
				( event ) => {
					if ( preference.matches || ! pointer.matches ) {
						return;
					}
					pointerTarget = element;
					pointerX = event.clientX;
					pointerY = event.clientY;
					if ( ! pointerFrame ) {
						pointerFrame =
							window.requestAnimationFrame( updatePointer );
					}
				},
				{ passive: true }
			);
			element.addEventListener( 'pointerleave', () => {
				if ( pointerTarget === element ) {
					pointerTarget = null;
				}
				element.style.setProperty( '--avenor-magnet-x', '0px' );
				element.style.setProperty( '--avenor-magnet-y', '0px' );
			} );
		} );

	preference.addEventListener( 'change', () => {
		window.cancelAnimationFrame( pointerFrame );
		pointerFrame = 0;
	} );
}
