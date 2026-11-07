import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps } from '@wordpress/block-editor';
import ServerSideRender from '@wordpress/server-side-render';
import { registerPlugin } from '@wordpress/plugins';
import CollectionControls from './editor/CollectionControls';
import BusinessFields from './editor/BusinessFields';
import services from './services-grid/block.json';
import cases from './case-studies-grid/block.json';
import team from './team-grid/block.json';
import testimonials from './testimonials/block.json';
import contact from './contact-form/block.json';
import profile from './business-profile/block.json';

[ services, cases, team, testimonials, contact, profile ].forEach(
	( metadata ) => {
		registerBlockType( metadata.name, {
			edit: function Edit( { attributes, setAttributes } ) {
				const isGrid = metadata.attributes?.count;
				return (
					<div { ...useBlockProps() }>
						{ isGrid && (
							<CollectionControls
								metadata={ metadata }
								attributes={ attributes }
								setAttributes={ setAttributes }
							/>
						) }
						<ServerSideRender
							block={ metadata.name }
							attributes={ attributes }
						/>
					</div>
				);
			},
			save: () => null,
		} );
	}
);

registerPlugin( 'avenor-business-fields', { render: BusinessFields } );
