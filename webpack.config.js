var path = require("path");
var webpack = require("webpack");
const nodeExternals = require('webpack-node-externals');
var cleanWebpack = require("clean-webpack-plugin").CleanWebpackPlugin;
console.log('------------------------------------');
module.exports = {
  mode: "production",
  entry: {
    index: path.resolve(__dirname, "src/index.js"),
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "lib"),
    libraryTarget: 'commonjs2'
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: "babel-loader",
        exclude: "/node_modules/",
        options: {
          cacheDirectory: true,
          cacheCompression: true, // 启用gzip压缩
          compact: true, 
        }
      }
    ]
  },
  externals: [nodeExternals()],
  plugins: [
    new cleanWebpack(),
  ],
  resolve: {
    // 省略后缀
    extensions: ['.js', '.jsx']
  },
};
