const path = require('path');
const fs = require('fs');

const outlineDir = path.resolve('outline');

const content = fs.readdirSync(outlineDir, { withFileTypes: true })
	.filter(dirent => dirent.isDirectory())
	.map(dirent => dirent.name);

const resolveOptions = content.reduce((acc, dirName) => ({
	...acc,
	[dirName]: path.resolve(outlineDir, dirName),
}), {});

module.exports = {
	siteMetadata: {
		title: 'gatsby-outline',
	},
	plugins: [
		'gatsby-plugin-sass',
		'gatsby-plugin-styled-components',
		'gatsby-plugin-flow',
		{
			resolve: 'gatsby-plugin-create-client-paths',
			options: { prefixes: ['/app/*'] },
		},
		{
			resolve: 'gatsby-plugin-root-import',
			options: {
				outline: outlineDir,
				shared: path.resolve('shared'),
				...resolveOptions,
			}
		}
	],
};
