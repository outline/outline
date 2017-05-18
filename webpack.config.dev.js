/* eslint-disable */
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');

const commonWebpackConfig = require('./webpack.config');

const developmentWebpackConfig = Object.assign(commonWebpackConfig, {
  cache: true,
  devtool: 'eval-source-map',
  entry: [
    'babel-polyfill',
    'babel-regenerator-runtime',
    'webpack-hot-middleware/client',
    './frontend/index',
  ],
});

developmentWebpackConfig.module.loaders.push({
  test: /\.s?css$/,
  loader: 'style-loader!css-loader?modules&importLoaders=1&localIdentName=[name]__[local]___[hash:base64:5]!sass?sourceMap',
});
developmentWebpackConfig.plugins.push(
  new webpack.optimize.OccurenceOrderPlugin()
);
developmentWebpackConfig.plugins.push(new webpack.HotModuleReplacementPlugin());
developmentWebpackConfig.plugins.push(new webpack.NoErrorsPlugin());
developmentWebpackConfig.plugins.push(
  new HtmlWebpackPlugin({
    title: 'Atlas',
  })
);

module.exports = developmentWebpackConfig;
