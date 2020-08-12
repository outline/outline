/* eslint-disable */
const path = require('path');
const webpack = require('webpack');
const ManifestPlugin = require('webpack-manifest-plugin');

commonWebpackConfig = require('./webpack.config');

productionWebpackConfig = Object.assign(commonWebpackConfig, {
  cache: true,
  mode: "production",
  devtool: 'source-map',
  entry: ['./app/index'],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.[hash].js',
    publicPath: '/static/',
  },
  stats: "normal"
});
productionWebpackConfig.plugins = [
  ...productionWebpackConfig.plugins,
  new ManifestPlugin()
];

module.exports = productionWebpackConfig;
