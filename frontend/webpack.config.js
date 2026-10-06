const HtmlWebPackPlugin = require('html-webpack-plugin');
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const path = require('path');
const Dotenv = require('dotenv-webpack');

const deps = require('./package.json').dependencies;
const printCompilationMessage = require('./compilation.config.js');

module.exports = (_, argv) => ({
  output: {
    path: path.resolve(__dirname, 'dist/'),
    publicPath: 'auto', // necessary for CDNs / S3
    filename: 'main.js',
    chunkFilename: '[id].[contenthash].js',
    assetModuleFilename: 'assets/[name].[contenthash][ext]',
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
  },

  devServer: {
    port: 3005,
    historyApiFallback: true,
    client: {
      overlay: {
        runtimeErrors: (error) => !error.message.includes('ResizeObserver'),
      },
    },
    watchFiles: [path.resolve(__dirname, 'src')],
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
    },
    onListening: function (devServer) {
      const port = devServer.server.address().port;
      printCompilationMessage('compiling', port);
      devServer.compiler.hooks.done.tap('OutputMessagePlugin', (stats) => {
        setImmediate(() => {
          if (stats.hasErrors()) {
            printCompilationMessage('failure', port);
          } else {
            printCompilationMessage('success', port);
          }
        });
      });
    },
  },

  module: {
    rules: [
      {
        test: /\.m?js/,
        type: 'javascript/auto',
        resolve: { fullySpecified: false },
      },
      {
        test: /\.(css|s[ac]ss)$/i,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /[\\/]node_modules[\\/](?!(@innovation)[\\/])/,
        use: { loader: 'babel-loader' },
      },
      {
        test: /\.svg$/,
        use: ['@svgr/webpack'],
      },
    ],
  },

  plugins: [
    new ModuleFederationPlugin({
      name: 'velocity_microfrontend_platform',
      filename: 'remoteEntry.js',
      remotes: {},
      exposes: {
        // Shell loads this as: React.lazy(() => import('platform/PlatformApp'))
        './PlatformApp': './src/App',
      },
      shared: {
        ...deps,
        react: {
          singleton: true,
          requiredVersion: false,
        },
        'react-dom': {
          singleton: true,
          requiredVersion: false,
        },
      },
    }),
    new HtmlWebPackPlugin({
      template: './src/index.html',
    }),
    new Dotenv(),
  ],
});
