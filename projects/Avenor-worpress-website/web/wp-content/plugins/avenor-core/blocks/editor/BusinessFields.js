import {
	TextControl,
	ToggleControl,
	SelectControl,
} from '@wordpress/components';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { useEntityProp } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { ENTRY_KINDS } from './options';

export default function BusinessFields() {
	const type = useSelect(
		( select ) => select( 'core/editor' ).getCurrentPostType(),
		[]
	);
	const [ meta, setMeta ] = useEntityProp( 'postType', type, 'meta' );
	if (
		! [
			'avenor_service',
			'avenor_case',
			'avenor_team',
			'avenor_testimonial',
		].includes( type ) ||
		! meta
	) {
		return null;
	}
	const update = ( key, value ) => setMeta( { ...meta, [ key ]: value } );
	return (
		<PluginDocumentSettingPanel
			name="avenor-business"
			title="AVENOR details"
		>
			<ToggleControl
				label="Featured"
				checked={ !! meta.avenor_featured }
				onChange={ ( value ) => update( 'avenor_featured', value ) }
			/>
			{ type === 'avenor_case' && (
				<SelectControl
					label="Entry type"
					value={ meta.avenor_entry_kind || 'architecture' }
					options={ ENTRY_KINDS }
					onChange={ ( value ) =>
						update( 'avenor_entry_kind', value )
					}
				/>
			) }
			{ [ 'avenor_team', 'avenor_testimonial' ].includes( type ) && (
				<>
					<TextControl
						label="Position / role"
						value={ meta.avenor_role || '' }
						onChange={ ( value ) => update( 'avenor_role', value ) }
					/>
					<TextControl
						label="Company"
						value={ meta.avenor_company || '' }
						onChange={ ( value ) =>
							update( 'avenor_company', value )
						}
					/>
					<TextControl
						label="Social profile URL"
						value={ meta.avenor_social || '' }
						onChange={ ( value ) =>
							update( 'avenor_social', value )
						}
					/>
				</>
			) }
			{ [ 'avenor_service', 'avenor_case' ].includes( type ) && (
				<TextControl
					label="Related entry IDs, separated by commas"
					value={ ( meta.avenor_related || [] ).join( ', ' ) }
					onChange={ ( value ) =>
						update(
							'avenor_related',
							value
								.split( ',' )
								.map( Number )
								.filter(
									( id ) => Number.isInteger( id ) && id > 0
								)
						)
					}
				/>
			) }
		</PluginDocumentSettingPanel>
	);
}
