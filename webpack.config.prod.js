/* eslint-disable */
var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

commonWebpackConfig = require('./webpack.config');

productionWebpackConfig = Object.assign(commonWebpackConfig, {
  cache: true,
  devtool: 'source-map',
  entry: ['babel-polyfill', 'babel-regenerator-runtime', './app/index'],
  output: {
    path: path.join(__dirname, '../dist'),
    filename: 'bundle.[hash].js',
    publicPath: '/static/',
  },
  stats: "normal"
});
productionWebpackConfig.plugins.push(
  new HtmlWebpackPlugin({
    template: 'server/static/index.html',
  })
);
productionWebpackConfig.plugins.push(
  new ExtractTextPlugin({ filename: 'styles.[hash].css' })
);
productionWebpackConfig.plugins.push(
  new webpack.optimize.UglifyJsPlugin({
    sourceMap: true,
  })
);
productionWebpackConfig.plugins.push(
  new webpack.DefinePlugin({
    'process.env': {
      URL: JSON.stringify(process.env.URL),
      NODE_ENV: JSON.stringify('production'),
      GOOGLE_ANALYTICS_ID: JSON.stringify(process.env.GOOGLE_ANALYTICS_ID),
    },
  })
);

module.exports = productionWebpackConfig;
