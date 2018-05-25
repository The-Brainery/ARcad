var webConfig = {
  entry: './src/ARcad.js',
  output: {
    filename: './build/ARcad.web.js',
    library: 'ARcad',
    libraryTarget: 'var'
  },
  module:{
    loaders: [
      { test: /\.(png|woff|woff2|eot|ttf|svg|otf)$/,
        loader: 'url-loader?limit=100000'
      },
      { test: /\.css$/,
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader' }
        ]
      }
    ]
  },
  resolve: {
      alias: {
          "jquery": "jquery"
      }
  }
};

module.exports = webConfig;
