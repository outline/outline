var path = require('path');
var webpack = require('webpack');

const commonWebpackConfig = require('./webpack.config');

const developmentWebpackConfig = Object.assign(commonWebpackConfig, {
  cache: true,
  devtool: 'eval',
  entry: [
    'babel-polyfill',
    'webpack-hot-middleware/client',
    './src/index',
  ],
});

developmentWebpackConfig.plugins.push(new webpack.optimize.OccurenceOrderPlugin());
developmentWebpackConfig.plugins.push(new webpack.HotModuleReplacementPlugin());
developmentWebpackConfig.plugins.push(new webpack.NoErrorsPlugin());

module.exports = developmentWebpackConfig;
