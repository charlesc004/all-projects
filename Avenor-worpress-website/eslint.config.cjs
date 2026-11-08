const defaults = require('@wordpress/scripts/config/eslint.config.cjs');
const wordpress = ['blocks', 'block-editor', 'components', 'core-data', 'data', 'editor', 'plugins', 'server-side-render'].map(name => `@wordpress/${name}`);

module.exports = [
  ...defaults,
  {
    // WordPress resolves these IDs through its versioned native import map.
    settings: {
      'import/core-modules': [...wordpress, ...Object.keys(require('./web/wp-content/themes/avenor/assets/modules.json'))],
    },
  },
];
