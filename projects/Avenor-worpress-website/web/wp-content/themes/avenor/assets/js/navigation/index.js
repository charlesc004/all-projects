import { createAnimationScope } from '@avenor/animation';
import { reducedMotion, desktop } from '@avenor/media';
import { createMenuIcon } from '@avenor/menu-icon';

// Keep the native WordPress dialog's focus trap, Escape key and scroll locking.
document
	.querySelectorAll( '.site-header .wp-block-navigation' )
	.forEach( ( navigation ) => {
		const overlay = navigation.querySelector(
			'.wp-block-navigation__responsive-container'
		);
		const close = navigation.querySelector(
			'.wp-block-navigation__responsive-container-close'
		);
		if ( ! overlay || ! close ) {
			return;
		}
		const panel = overlay.querySelector(
			'.wp-block-navigation__responsive-close'
		);
		const reduced = reducedMotion;

		let isOpen = overlay.classList.contains( 'is-menu-open' );
		let closing = false;
		let nativeClose = false;
		const icon = createMenuIcon( navigation, close );
		icon.setOpen( isOpen );
		const scope = createAnimationScope( 'cubic-bezier(.22, 1, .36, 1)' );
		const stopAnimations = scope.stop;
		const animate = (
			target,
			frames,
			duration,
			delay = 0,
			fill = 'backwards'
		) => scope.animate( target, frames, { duration, delay, fill } );
		function finishClose() {
			if ( ! closing ) {
				return;
			}
			closing = false;
			nativeClose = true;
			close.click();
			nativeClose = false;
		}
		close.addEventListener(
			'click',
			( event ) => {
				if (
					nativeClose ||
					reduced.matches ||
					desktop.matches ||
					! panel?.animate ||
					! isOpen
				) {
					return;
				}
				event.preventDefault();
				event.stopImmediatePropagation();
				if ( closing ) {
					return;
				}
				const overlayOpacity =
					window.getComputedStyle( overlay ).opacity;
				const panelStyle = window.getComputedStyle( panel );
				const panelTransform = panelStyle.transform;
				const panelOpacity = panelStyle.opacity;
				stopAnimations();
				closing = true;
				icon.setOpen( false );
				animate(
					overlay,
					[ { opacity: overlayOpacity }, { opacity: 0 } ],
					220,
					0,
					'forwards'
				);
				const exit = animate(
					panel,
					[
						{ opacity: panelOpacity, transform: panelTransform },
						{
							opacity: 0,
							transform: 'translate3d(36px, 0, 0) scale(.98)',
						},
					],
					220,
					0,
					'forwards'
				);
				exit.finished.catch( () => {} ).then( finishClose );
			},
			true
		);
		overlay.addEventListener(
			'keydown',
			( event ) => {
				if (
					event.key === 'Escape' &&
					isOpen &&
					! reduced.matches &&
					! desktop.matches
				) {
					event.preventDefault();
					event.stopImmediatePropagation();
					close.click();
				}
			},
			true
		);
		new window.MutationObserver( () => {
			const nextOpen = overlay.classList.contains( 'is-menu-open' );
			if ( nextOpen === isOpen ) {
				return;
			}
			isOpen = nextOpen;
			if ( isOpen ) {
				icon.reveal( () => isOpen && ! closing );
			} else {
				icon.setOpen( false );
			}
			stopAnimations();
			if ( ! isOpen ) {
				closing = false;
				return;
			}
			if ( reduced.matches || desktop.matches || ! panel?.animate ) {
				return;
			}
			animate( overlay, [ { opacity: 0 }, { opacity: 1 } ], 320 );
			animate(
				panel,
				[
					{
						opacity: 0.5,
						transform: 'translate3d(48px, 0, 0) scale(.97)',
					},
					{ opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
				],
				460
			);
			overlay
				.querySelectorAll(
					'.menu-intro, .wp-block-navigation-item, .menu-outro'
				)
				.forEach( ( item, index ) => {
					animate(
						item,
						[
							{
								opacity: 0,
								transform: 'translate3d(0, 14px, 0)',
							},
							{ opacity: 1, transform: 'translate3d(0, 0, 0)' },
						],
						360,
						60 + index * 35
					);
				} );
		} ).observe( overlay, {
			attributes: true,
			attributeFilter: [ 'class' ],
		} );
		reduced.addEventListener( 'change', () => {
			stopAnimations();
			finishClose();
		} );
		overlay.addEventListener( 'click', ( event ) => {
			if ( event.target === overlay ) {
				close.click();
			}
		} );
		desktop.addEventListener( 'change', ( event ) => {
			if (
				event.matches &&
				overlay.classList.contains( 'is-menu-open' )
			) {
				stopAnimations();
				closing = false;
				close.click();
			}
		} );
	} );
