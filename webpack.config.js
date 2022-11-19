/* eslint-disable */
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { RelativeCiAgentWebpackPlugin } = require('@relative-ci/agent');
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
        test: /\.[jt]sx?$/,
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
        test: /\.(woff|woff2|ttf|eot)$/,
        loader:
          'url-loader?limit=1&mimetype=application/font-woff&name=public/fonts/[name].[ext]',
      },
      { test: /\.md/, loader: 'raw-loader' },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
    modules: [
      path.resolve(__dirname, 'app'),
      'node_modules'
    ],
    alias: {
      "~": path.resolve(__dirname, 'app'),
      "@shared": path.resolve(__dirname, 'shared'),
      "@server": path.resolve(__dirname, 'server'),
      'boundless-popover': 'boundless-popover/build',
      'boundless-utils-omit-keys': 'boundless-utils-omit-keys/build',
      'boundless-utils-uuid': 'boundless-utils-uuid/build'
    }
  },
  plugins: [
    new webpack.IgnorePlugin(/unicode\/category\/So/),
    new HtmlWebpackPlugin({
      template: 'server/static/index.html',
    }),
    new WebpackPwaManifest({
      name: "Outline",
      short_name: "Outline",
      background_color: "#fff",
      theme_color: "#fff",
      start_url: "/",
      publicPath: "/static/",
      display: "standalone",
      icons: [
        {
          src: path.resolve("public/images/icon-512.png"),
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
    chunkIds: 'named',
    splitChunks: {
      chunks: 'async',
      minSize: 20000,
      minChunks: 1,
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      enforceSizeThreshold: 50000,
      cacheGroups: {
        defaultVendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
          reuseExistingChunk: true,
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        }
      }
    }
  }
};
