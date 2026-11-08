export function createMenuIcon( navigation, close ) {
	let frame = 0;
	function setOpen( opened ) {
		window.cancelAnimationFrame( frame );
		navigation.classList.toggle( 'is-icon-open', opened );
	}
	function reveal( getState ) {
		window.cancelAnimationFrame( frame );
		frame = window.requestAnimationFrame( () => {
			frame = window.requestAnimationFrame( () => setOpen( getState() ) );
		} );
	}
	const open = navigation.querySelector(
		'.wp-block-navigation__responsive-container-open'
	);
	[ open, close ].filter( Boolean ).forEach( ( button ) => {
		const icon = document.createElement( 'span' );
		icon.className = 'avenor-menu-icon';
		icon.setAttribute( 'aria-hidden', 'true' );
		icon.append(
			document.createElement( 'span' ),
			document.createElement( 'span' )
		);
		button.append( icon );
		button.classList.add( 'has-animated-menu-icon' );
	} );
	setOpen( false );
	return { setOpen, reveal };
}
