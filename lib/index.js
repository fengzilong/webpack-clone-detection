const signature = require( 'code-signature' )

const ID = `WebpackCloneDetectionPlugin`

module.exports = class WebpackCloneDetectionPlugin {
  apply( compiler ) {
    const clones = {}

    function addToClonesBySignature( entry ) {
      clones[ entry.signature ] = clones[ entry.signature ] || []

      if ( !clones[ entry.signature ].includes( entry ) ) {
        clones[ entry.signature ].push( entry )
      }
    }

    compiler.hooks.compilation.tap( ID, compilation => {
      compilation.mainTemplate.hooks.render
        .tap( ID, ( source, chunk ) => {
          const modules = chunk.getModules()

          const entries = modules
            .filter( module => Boolean( module.resource ) )
            .map( module => {
              const file = module.resource
              const content = module.originalSource().source()
              return {
                file,
                content,
                // signature: signature( content ),
                signature: JSON.stringify( signature( content ) ),
              }
            } )

          const len = entries.length
          for ( let i = 0; i < len; i++ ) {
            const entry = entries[ i ]
            addToClonesBySignature( entry )

            for ( let j = i + 1; j < len; j++ ) {
              const targetEntry = entries[ j ]
              if ( entry.signature === targetEntry.signature ) {
                addToClonesBySignature( targetEntry )
              }
            }
          }

          return source
        } )
    } )

    compiler.hooks.done.tap( ID, () => {
      Object.keys( clones )
        .filter( key => {
          return clones[ key ].length > 1
        } )
        .forEach( key => {
          const clone = clones[ key ]
          console.log()
          console.log( 'Clones detected (maybe):' )
          console.log( clone.map( c => c.file ).join( '\n' ) )
          console.log()
        } )
    } )
  }
}

function stringifySignature( signature ) {

}
