/* eslint-disable */
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

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

developmentWebpackConfig.plugins.push(
  new webpack.optimize.OccurenceOrderPlugin()
);
developmentWebpackConfig.plugins.push(new ExtractTextPlugin('styles.css'));
developmentWebpackConfig.plugins.push(new webpack.HotModuleReplacementPlugin());
developmentWebpackConfig.plugins.push(new webpack.NoErrorsPlugin());
developmentWebpackConfig.plugins.push(
  new HtmlWebpackPlugin({
    title: 'Outline',
  })
);

module.exports = developmentWebpackConfig;
