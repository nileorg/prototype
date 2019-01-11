const path = require('path');

module.exports = {
  entry: './src/node.js',
  output: {
    filename: 'main.js',
    library: "Node",
    path: path.resolve(__dirname, 'dist')
  }
};