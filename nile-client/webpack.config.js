const path = require('path')

module.exports = {
  entry: './src/client.js',
  output: {
    filename: 'main.min.js',
    library: 'Client',
    path: path.resolve(__dirname, 'dist')
  },
  watch: true,
}
