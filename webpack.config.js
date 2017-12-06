const { resolve } = require('path');
const webpack = require('webpack');
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
			, loader: 'babel-loader?presets[]=es2015&presets[]=react&presets[]=stage-0'
		}, {
			test: /\.less$/
			, use: ['css-hot-loader'].concat(ExtractTextPlugin.extract({
				fallback: 'style-loader',
				use: [
					{loader: 'css-loader', options: {importLoaders: 1, sourceMap: true}},
					{loader: 'less-loader', options: {sourceMap: true}}
				]
			}))
		}, {
			test: /\.css$/
			, use: ['css-hot-loader'].concat(ExtractTextPlugin.extract({
				fallback: 'style-loader',
				use: 'css-loader'
			}))
		}, {
			test: /\.(png|jpg)$/,
			loader: 'url-loader?name=images/[name].[ext]&limit=8192' }
		]
	},

	plugins: [
		new ExtractTextPlugin('styles.css')
	]
};