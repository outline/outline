/* eslint-disable */
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

require('dotenv').config({ silent: true });

module.exports = {
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/static/',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: [
          path.join(__dirname, 'node_modules')
        ],
        include: [
          path.join(__dirname, 'app'),
          path.join(__dirname, 'shared'),
        ],
        options: {
          cacheDirectory: true
        }
      },
      { test: /\.json$/, loader: 'json-loader' },
      // inline base64 URLs for <=8k images, direct URLs for the rest
      { test: /\.(png|jpg|svg)$/, loader: 'url-loader' },
      {
        test: /\.woff$/,
        loader: 'url-loader?limit=1&mimetype=application/font-woff&name=public/fonts/[name].[ext]',
      },
      { test: /\.md/, loader: 'raw-loader' },
    ]
  },
  resolve: {
    modules: [
      path.resolve(__dirname, 'app'),
      'node_modules'
    ],
    mainFields: ["browser",  "main"],
    alias: {
      shared: path.resolve(__dirname, 'shared'),
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      fetch: 'imports-loader?this=>global!exports-loader?global.fetch!isomorphic-fetch',
    }),
    new webpack.IgnorePlugin(/unicode\/category\/So/),
    new HtmlWebpackPlugin({
      template: 'server/static/index.html',
    }),
  ],
  stats: {
    assets: false,
  },
};
