import { InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	RangeControl,
	ToggleControl,
	SelectControl,
} from '@wordpress/components';
import { COLLECTION_KINDS } from './options';

export default function CollectionControls( {
	metadata,
	attributes,
	setAttributes,
} ) {
	return (
		<InspectorControls>
			<PanelBody title="Collection settings">
				{ metadata.attributes?.contentKind && (
					<SelectControl
						label="Content collection"
						value={ attributes.contentKind }
						options={ COLLECTION_KINDS }
						onChange={ ( contentKind ) =>
							setAttributes( { contentKind } )
						}
					/>
				) }
				<TextControl
					label="Section heading"
					value={ attributes.heading }
					onChange={ ( heading ) => setAttributes( { heading } ) }
				/>
				<RangeControl
					label="Number of entries"
					min={ 1 }
					max={ 12 }
					value={ attributes.count }
					onChange={ ( count ) => setAttributes( { count } ) }
				/>
				<RangeControl
					label="Columns"
					min={ 1 }
					max={ 3 }
					value={ attributes.columns }
					onChange={ ( columns ) => setAttributes( { columns } ) }
				/>
				<TextControl
					label="Category or industry term ID (0 = all)"
					type="number"
					value={ attributes.category }
					onChange={ ( value ) =>
						setAttributes( {
							category: Math.max( 0, Number( value ) ),
						} )
					}
				/>
				<ToggleControl
					label="Featured entries only"
					checked={ attributes.featured }
					onChange={ ( featured ) => setAttributes( { featured } ) }
				/>
				<ToggleControl
					label="Use current entry’s related content"
					checked={ attributes.related }
					onChange={ ( related ) => setAttributes( { related } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
