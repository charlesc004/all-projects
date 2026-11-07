export function headline( element, delay, animate ) {
	if ( ! element.querySelector( '.avenor-motion-word' ) ) {
		const walker = document.createTreeWalker(
			element,
			window.NodeFilter.SHOW_TEXT
		);
		const nodes = [];
		while ( walker.nextNode() ) {
			nodes.push( walker.currentNode );
		}
		nodes.forEach( ( node ) => {
			const fragment = document.createDocumentFragment();
			node.textContent.split( /(\s+)/ ).forEach( ( word ) => {
				if ( ! word.trim() ) {
					fragment.append( document.createTextNode( word ) );
					return;
				}
				const span = document.createElement( 'span' );
				span.className = 'avenor-motion-word';
				span.textContent = word;
				fragment.append( span );
			} );
			node.replaceWith( fragment );
		} );
	}
	element
		.querySelectorAll( '.avenor-motion-word' )
		.forEach( ( word, index ) => {
			animate(
				word,
				[
					{
						opacity: 0,
						transform: 'translate3d(0, .8em, 0) rotate(3deg)',
					},
					{
						opacity: 1,
						transform: 'translate3d(0, 0, 0) rotate(0deg)',
					},
				],
				delay + Math.min( index, 7 ) * 60
			);
		} );
}
