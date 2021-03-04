const editorPkg = require('rich-markdown-editor/package.json');
const packagePkg = require('./package.json');

exports.onCreateWebpackConfig = ({plugins, actions}) => {
	actions.setWebpackConfig({
		resolve: {
			fallback: {
				path: require.resolve('path-browserify'),
			}
		},
		plugins: [
			plugins.define({
				'process.env.GATSBY_EDITOR_VERSION': JSON.stringify(editorPkg.version),
				'process.env.GATSBY_PACKAGE_VERSION': JSON.stringify(packagePkg.version),
			})
		]
	});
};

exports.onCreatePage = async ({ page, actions }) => {
	const { createPage } = actions;
	if (page.path.match(/^\/app/)) {
		page.matchPath = '/app/*';
		createPage(page);
	}
};
