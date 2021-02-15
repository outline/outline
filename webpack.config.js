/* eslint-disable */
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { RelativeCiAgentWebpackPlugin } = require('@relative-ci/agent');
const pkg = require("rich-markdown-editor/package.json");
const WebpackPwaManifest = require("webpack-pwa-manifest");
const WorkboxPlugin = require("workbox-webpack-plugin");

require('dotenv').config({ silent: true });

module.exports = {
  output: {
    path: path.join(__dirname, 'build/app'),
    filename: '[name].[hash].js',
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
    new webpack.DefinePlugin({
      EDITOR_VERSION: JSON.stringify(pkg.version)
    }),
    new webpack.ProvidePlugin({
      fetch: 'imports-loader?this=>global!exports-loader?global.fetch!isomorphic-fetch',
    }),
    new webpack.IgnorePlugin(/unicode\/category\/So/),
    new HtmlWebpackPlugin({
      template: 'server/static/index.html',
    }),
    new WebpackPwaManifest({
      name: "Outline",
      short_name: "Outline",
      background_color: "#fff",
      theme_color: "#fff",
      start_url: process.env.URL,
      display: "standalone",
      icons: [
        {
          src: path.resolve("public/icon-512.png"),
          // For Chrome, you must provide at least a 192x192 pixel icon, and a 512x512 pixel icon.
          // If only those two icon sizes are provided, Chrome will automatically scale the icons
          // to fit the device. If you'd prefer to scale your own icons, and adjust them for
          // pixel-perfection, provide icons in increments of 48dp.
          sizes: [512, 192],
          purpose: "any maskable",
        },
      ]
    }),
    new WorkboxPlugin.GenerateSW({
      clientsClaim: true,
      skipWaiting: true,
      maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // For large bundles
    }),
    new RelativeCiAgentWebpackPlugin(),
  ],
  stats: {
    assets: false,
  },
  optimization: {
    runtimeChunk: 'single',
    moduleIds: 'hashed',
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'initial',
        },
      },
    },
  }
};
