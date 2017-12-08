const { resolve } = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
	devtool: 'source-map',
	entry: [resolve(__dirname, 'client/index.js')],

	output: {
		filename: 'bundle.js',
		// the output bundle

		path: resolve(__dirname, 'dist'),

		publicPath: '/'
	},

	module: {
		rules: [{
			test: /\.js$/
			, exclude: /node_modules/
			, loader: 'babel-loader'
			, options: {
				presets: ['env', 'react']
			}
		}, {
			test: /\.less$/
			, use: [
				{loader: 'style-loader', options: {sourceMap: true}},
				{loader: 'css-loader', options: {importLoaders: 1, sourceMap: true}},
				{loader: 'less-loader', options: {sourceMap: true}}
			]
		}, {
			test: /\.(png|jpg)$/,
			loader: 'url-loader?name=images/[name].[ext]&limit=8192' }
		]
	},

	plugins: [
		new ExtractTextPlugin('styles.css')
	]
};