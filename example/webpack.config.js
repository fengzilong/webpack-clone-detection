const CloneDetectionPlugin = require( '../' )
const MiniCSSExtractPlugin = require( 'mini-css-extract-plugin' )

module.exports = {
  entry: `./src/index.js`,
  mode: 'development',
  devtool: 'cheap-module-source-map',
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [MiniCSSExtractPlugin.loader, "css-loader"],
      },
    ],
  },
  plugins: [
    new CloneDetectionPlugin( {
      wrap( moduleSource ) {
        return [
          `\n/* hello */\n`,
          moduleSource,
          `\n/* world */\n`
        ]
      }
    } ),
    new MiniCSSExtractPlugin(),
  ]
}
