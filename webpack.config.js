/* eslint-disable */
const path = require('path');
const webpack = require('webpack');

require('dotenv').config({ silent: true });

const definePlugin = new webpack.DefinePlugin({
  __DEV__: JSON.stringify(JSON.parse(process.env.NODE_ENV !== 'production')),
  __PRERELEASE__: JSON.stringify(
    JSON.parse(process.env.BUILD_PRERELEASE || 'false')
  ),
  SLACK_APP_ID: JSON.stringify(process.env.SLACK_APP_ID),
  BASE_URL: JSON.stringify(process.env.URL),
  SENTRY_DSN: JSON.stringify(process.env.SENTRY_DSN),
  DEPLOYMENT: JSON.stringify(process.env.DEPLOYMENT || 'hosted'),
  'process.env': {
    URL: JSON.stringify(process.env.URL),
    SLACK_KEY: JSON.stringify(process.env.SLACK_KEY),
    SUBDOMAINS_ENABLED: JSON.stringify(process.env.SUBDOMAINS_ENABLED === 'true'),
    WEBSOCKETS_ENABLED: JSON.stringify(process.env.WEBSOCKETS_ENABLED === 'true')
  }
});

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
    definePlugin,
    new webpack.ProvidePlugin({
      fetch: 'imports-loader?this=>global!exports-loader?global.fetch!isomorphic-fetch',
    }),
    new webpack.IgnorePlugin(/unicode\/category\/So/),
  ],
  stats: {
    assets: false,
  },
};
