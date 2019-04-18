/* eslint-disable */
var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var UglifyJsPlugin = require('uglifyjs-webpack-plugin');
var ManifestPlugin = require('webpack-manifest-plugin');

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
  new HtmlWebpackPlugin({
    template: 'server/static/index.html',
  }),
  new ExtractTextPlugin({ filename: 'styles.[hash].css' }),
  new UglifyJsPlugin({
    sourceMap: true,
    uglifyOptions: {
      compress: true,
      keep_fnames: true
    }
  }),
  new webpack.DefinePlugin({
    'process.env.URL': JSON.stringify(process.env.URL),
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env.GOOGLE_ANALYTICS_ID': JSON.stringify(process.env.GOOGLE_ANALYTICS_ID),
    'process.env.SUBDOMAINS_ENABLED': JSON.stringify(process.env.SUBDOMAINS_ENABLED === 'true'),
    'process.env.WEBSOCKETS_ENABLED': JSON.stringify(process.env.WEBSOCKETS_ENABLED === 'true'),
  }),
];

module.exports = productionWebpackConfig;
