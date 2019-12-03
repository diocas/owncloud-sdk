module.exports = {
  mode: 'production',
  entry: {
    files: [
      '@babel/polyfill',
      './src/index.js'
    ]
  },
  output: {
    filename: 'owncloud.js',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  module: {
    rules: [{
      test: /\.js?$/,
      exclude: /node_modules/,
      loader: 'babel-loader'
    }, {
      enforce: 'pre',
      test: /\.(js|vue)$/,
      exclude: /node_modules/,
      loader: 'eslint-loader'
    }]
  },
  watchOptions: {
    ignored: ['.*', 'tests', 'build', 'dist', 'node_modules']
  }
}
