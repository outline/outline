var path = require('path');
var webpack = require('webpack');

commonWebpackConfig = require('./webpack.config');

developmentWebpackConfig = Object.assign(commonWebpackConfig, {
  cache: true,
  devtool: 'eval',
  entry: [
    'webpack-hot-middleware/client',
    './src/index',
  ],
});

developmentWebpackConfig.plugins.push(new webpack.HotModuleReplacementPlugin());
developmentWebpackConfig.plugins.push(new webpack.NoErrorsPlugin());

module.exports = developmentWebpackConfig;
