/* eslint-disable */
const webpack = require("webpack");
const commonWebpackConfig = require("./webpack.config");
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

const isTest = process.env.NODE_ENV === "test";

const developmentWebpackConfig = Object.assign(commonWebpackConfig, {
  cache: true,
  mode: "development",
  devtool: "eval-cheap-module-source-map",
  entry: [
    "webpack-hot-middleware/client",
    "./app/index",
  ],
  optimization: {
    usedExports: true,
  },
});

if (!isTest) {
  developmentWebpackConfig.plugins = [
    ...developmentWebpackConfig.plugins,
    new webpack.HotModuleReplacementPlugin(),
    new ReactRefreshWebpackPlugin({
      overlay: {
        sockIntegration: 'whm',
      },
    }),
  ];
}

module.exports = developmentWebpackConfig;
