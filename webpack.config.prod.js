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
      compress: true
    }
  }),
  new webpack.DefinePlugin({
    'process.env': {
      URL: JSON.stringify(process.env.URL),
      NODE_ENV: JSON.stringify('production'),
      GOOGLE_ANALYTICS_ID: JSON.stringify(process.env.GOOGLE_ANALYTICS_ID),
      SUBDOMAINS_ENABLED: JSON.stringify(process.env.SUBDOMAINS_ENABLED)
    },
  }),
];

module.exports = productionWebpackConfig;
