/* eslint-disable */
const path = require('path');
const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');

commonWebpackConfig = require('./webpack.config');

productionWebpackConfig = Object.assign(commonWebpackConfig, {
  cache: true,
  devtool: 'source-map',
  entry: ['babel-polyfill', 'babel-regenerator-runtime', './app/index'],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.[hash].js',
    publicPath: '/static/',
  },
  stats: "normal"
});
productionWebpackConfig.plugins = [
  ...productionWebpackConfig.plugins,
  new ManifestPlugin(),
  new UglifyJsPlugin({
    sourceMap: true,
    uglifyOptions: {
      compress: true,
      keep_fnames: true
    }
  }),
  new webpack.DefinePlugin({
    'process.env.NODE_ENV': JSON.stringify('production'),
  }),
];

module.exports = productionWebpackConfig;
