/* eslint-disable */
const path = require('path');
const webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

require('dotenv').config({ silent: true });

const definePlugin = new webpack.DefinePlugin({
  __DEV__: JSON.stringify(JSON.parse(process.env.NODE_ENV !== 'production')),
  __PRERELEASE__: JSON.stringify(
    JSON.parse(process.env.BUILD_PRERELEASE || 'false')
  ),
  SLACK_REDIRECT_URI: JSON.stringify(process.env.SLACK_REDIRECT_URI),
  SLACK_KEY: JSON.stringify(process.env.SLACK_KEY),
  BASE_URL: JSON.stringify(process.env.URL),
  BUGSNAG_KEY: JSON.stringify(process.env.BUGSNAG_KEY),
  DEPLOYMENT: JSON.stringify(process.env.DEPLOYMENT || 'hosted')
});

module.exports = {
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/static/',
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel',
        include: [
          path.join(__dirname, 'app'),
          path.join(__dirname, 'shared'),
        ],
      },
      { test: /\.json$/, loader: 'json-loader' },
      // inline base64 URLs for <=8k images, direct URLs for the rest
      { test: /\.(png|jpg|svg)$/, loader: 'url-loader' },
      {
        test: /\.woff$/,
        loader: 'url-loader?limit=1&mimetype=application/font-woff&name=public/fonts/[name].[ext]',
      },
      {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract('style-loader', 'css-loader'),
      },
      { test: /\.md/, loader: 'raw-loader' },
    ],
    // Silence warning https://github.com/localForage/localForage/issues/599
    noParse: [new RegExp('node_modules/localforage/dist/localforage.js')],
  },
  resolve: {
    root: path.resolve(__dirname, 'app'),
    extensions: ['', '.js', '.json'],
    alias: { shared: path.resolve(__dirname, 'shared') }
  },
  plugins: [
    definePlugin,
    new webpack.ProvidePlugin({
      fetch: 'imports?this=>global!exports?global.fetch!isomorphic-fetch',
    }),
    new webpack.ContextReplacementPlugin(/moment[\\\/]locale$/, /^\.\/(en)$/),
    new webpack.IgnorePlugin(/unicode\/category\/So/),
  ],
  stats: {
    assets: false,
  },
};
