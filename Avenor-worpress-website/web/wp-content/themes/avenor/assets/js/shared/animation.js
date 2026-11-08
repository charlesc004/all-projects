// Shared ownership prevents canceled animations from leaking or retaining styles.
export function createAnimationScope( easing = 'cubic-bezier(.16, 1, .3, 1)' ) {
	const active = new Set();
	function animate(
		element,
		frames,
		{ duration = 900, delay = 0, fill = 'backwards' } = {}
	) {
		const animation = element.animate( frames, {
			duration,
			delay,
			fill,
			easing,
		} );
		animation.id = 'avenor-enter';
		active.add( animation );
		animation.finished
			.catch( () => {} )
			.finally( () => {
				if ( fill !== 'forwards' ) {
					active.delete( animation );
				}
			} );
		return animation;
	}
	function stop() {
		active.forEach( ( animation ) => animation.cancel() );
		active.clear();
	}
	return { animate, stop, active };
}
