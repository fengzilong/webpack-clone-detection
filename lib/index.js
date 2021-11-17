/* eslint-disable no-magic-numbers */
const getSignature = require( 'code-signature' )
const { simhash, similarity } = require( '@biu/simhash' )
const average = require( 'average' )

const ID = `WebpackCloneDetectionPlugin`

module.exports = class WebpackCloneDetectionPlugin {
  apply( compiler ) {
    const clones = {}
    const maybeClones = {}

    function addToClonesBySignature( clones, entry ) {
      clones[ entry.signature ] = clones[ entry.signature ] || []

      if ( !clones[ entry.signature ].includes( entry ) ) {
        clones[ entry.signature ].push( entry )
      }
    }

    function isSimilar( hashesA, hashesB ) {
      const similarities = hashesA
        .map( ( hashA, i ) => {
          const hashB = hashesB[ i ]

          if ( !hashA && !hashB ) {
            return false
          }

          return similarity( hashA, hashB )
        } )
        .filter( sim => ( sim !== false ) )

      return average( similarities ) > 0.9
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
              const signature = getSignature( content )
              const hashes = Object.keys( signature ).map( key => {
                const factor = signature[ key ]
                return factor.length > 0 ?
                  simhash(
                    // eslint-disable-next-line max-nested-callbacks
                    factor.map( f => {
                      return {
                        text: String( f ),
                        weight: 1,
                      }
                    } )
                  ) :
                  ''
              } )

              return {
                file,
                content,
                signature: JSON.stringify( signature ),
                hashes,
              }
            } )

          const len = entries.length
          for ( let i = 0; i < len; i++ ) {
            const entry = entries[ i ]
            addToClonesBySignature( clones, entry )

            for ( let j = i + 1; j < len; j++ ) {
              const targetEntry = entries[ j ]
              if ( entry.signature === targetEntry.signature ) {
                addToClonesBySignature( clones, targetEntry )
              } else if ( isSimilar( entry.hashes, targetEntry.hashes ) ) {
                addToClonesBySignature( maybeClones, targetEntry )
              }
            }
          }

          return source
        } )
    } )

    compiler.hooks.done.tap( ID, () => {
      report( clones )
      report( maybeClones, 'Clones detected ( maybe ):' )
    } )
  }
}

function report( clones, title ) {
  Object.keys( clones )
    .filter( key => {
      return clones[ key ].length > 1
    } )
    .forEach( key => {
      const clone = clones[ key ]
      console.log()
      console.log( title || 'Clones detected:' )
      console.log( clone.map( c => '➤ ' + c.file ).join( '\n' ) )
      console.log()
    } )
}
