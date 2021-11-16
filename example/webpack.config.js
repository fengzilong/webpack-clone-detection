const ModuleWrapperPlugin = require( '../' )

module.exports = {
  entry: `./src/index.js`,
  mode: 'development',
  devtool: 'cheap-module-source-map',
  plugins: [
    new ModuleWrapperPlugin( {
      wrap( moduleSource ) {
        return [
          `\n/* hello */\n`,
          moduleSource,
          `\n/* world */\n`
        ]
      }
    } )
  ]
}
