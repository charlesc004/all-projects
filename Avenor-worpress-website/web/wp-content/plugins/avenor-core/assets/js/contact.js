document.querySelectorAll( '.avenor-contact-form' ).forEach( ( form ) => {
	form.addEventListener( 'submit', async ( event ) => {
		event.preventDefault();
		if (
			! form.reportValidity() ||
			form.getAttribute( 'aria-busy' ) === 'true'
		) {
			return;
		}
		const button = form.querySelector( 'button[type="submit"]' );
		const status = form.querySelector( '.form-status' );
		button.disabled = true;
		form.setAttribute( 'aria-busy', 'true' );
		status.textContent = 'Sending your inquiry…';
		const data = Object.fromEntries( new FormData( form ) );
		data.privacy = form.elements.privacy.checked;
		try {
			const response = await fetch( form.dataset.endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify( data ),
				signal: AbortSignal.timeout( 20000 ),
			} );
			const result = await response.json();
			if ( ! response.ok ) {
				throw new Error(
					result.message || 'Please try again shortly.'
				);
			}
			form.reset();
			status.textContent = result.message;
			status.dataset.state = 'success';
		} catch ( error ) {
			status.textContent =
				error.name === 'TimeoutError'
					? 'The request timed out. You can safely retry; duplicate inquiries are prevented.'
					: error.message || 'Connection failed. Please retry.';
			status.dataset.state = 'error';
		} finally {
			form.setAttribute( 'aria-busy', 'false' );
			button.disabled = false;
			status.focus();
		}
	} );
} );
