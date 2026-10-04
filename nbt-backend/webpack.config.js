const path = require('path');
const slsw = require('serverless-webpack');

module.exports = {
  entry: slsw.lib.entries,
  target: 'node',
  mode: slsw.lib.webpack.isLocal ? 'development' : 'production',
  
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
      '@services': path.resolve(__dirname, 'services'),
    },
  },
  
  output: {
    libraryTarget: 'commonjs',
    path: path.join(__dirname, '.webpack'),
    filename: '[name].js',
  },
  
  externals: [
    // AWS SDK is available in Lambda runtime
    /aws-sdk/,
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/lib-dynamodb',
  ],
  
  optimization: {
    minimize: false,
  },
  
  performance: {
    hints: false,
  },
};