/* eslint-disable */
const webpack = require('webpack');
const merge = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const commonWebpackConfig = require('./webpack.config');

const developmentWebpackConfig = merge(commonWebpackConfig, {
  cache: true,
  devtool: 'eval-source-map',
  resolve: {
    alias: {
      'react-dom': '@hot-loader/react-dom'
    }
  },
  entry: [
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
