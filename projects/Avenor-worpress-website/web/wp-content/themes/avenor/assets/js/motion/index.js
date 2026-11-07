import { reducedMotion, finePointer } from '@avenor/media';
import { initReveals } from '@avenor/reveals';
import { initScrollMotion } from '@avenor/scroll';
import { initPointerFeedback } from '@avenor/pointer';

const main = document.querySelector( 'main' );
if ( main && window.Element.prototype.animate && window.IntersectionObserver ) {
	initReveals( main, reducedMotion );
	initScrollMotion( main, reducedMotion, finePointer );
	initPointerFeedback( reducedMotion, finePointer );
}
