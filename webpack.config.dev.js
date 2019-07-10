/* eslint-disable */
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const commonWebpackConfig = require('./webpack.config');

const developmentWebpackConfig = Object.assign(commonWebpackConfig, {
  cache: true,
  devtool: 'eval-source-map',
  entry: [
    'babel-polyfill',
    'babel-regenerator-runtime',
    'webpack-hot-middleware/client',
    './app/index',
  ],
});

developmentWebpackConfig.plugins = [
  ...developmentWebpackConfig.plugins,
  new webpack.HotModuleReplacementPlugin(),
  new HtmlWebpackPlugin({
    title: 'Outline',
  }),
];

module.exports = developmentWebpackConfig;
