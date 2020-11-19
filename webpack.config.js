var nodeExternals = require('webpack-node-externals');
var path = require('path');

module.exports = {
  entry: ['babel-polyfill', './src/App.js'],
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'App.bundle.js'
  },
  target: 'node',
  externals: [nodeExternals()],
  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" }
    ]
  }
};