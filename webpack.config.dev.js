/* eslint-disable */
const webpack = require("webpack");
const commonWebpackConfig = require("./webpack.config");

const developmentWebpackConfig = Object.assign(commonWebpackConfig, {
  cache: true,
  mode: "development",
  devtool: "eval-source-map",
  entry: [
    "webpack-hot-middleware/client",
    "./app/index",
  ],
  optimization: {
    usedExports: true,
  },
});

developmentWebpackConfig.plugins = [
  ...developmentWebpackConfig.plugins,
  new webpack.HotModuleReplacementPlugin()
];

module.exports = developmentWebpackConfig;
