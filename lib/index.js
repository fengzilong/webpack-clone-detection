/* eslint-disable no-magic-numbers */
const getSimilarity = require( 'code-similarity' )

const ID = `WebpackCloneDetectionPlugin`

module.exports = class WebpackCloneDetectionPlugin {
  apply( compiler ) {
    const clones = []
    const maybeClones = []

    function addToClones( clones, targetEntry, addEntry ) {
      const found = clones.some( cloneGroup => {
        if ( cloneGroup.some( cloneEntry => cloneEntry === targetEntry ) ) {
          if ( cloneGroup.indexOf( addEntry ) === -1 ) {
            cloneGroup.push( addEntry )
          }
          return true
        }

        return false
      } )

      if ( !found ) {
        clones.push( [ addEntry ] )
      }
    }

    compiler.hooks.compilation.tap( ID, compilation => {
      if ( compilation.compiler !== compiler ) {
        return
      }

      compilation.mainTemplate.hooks.render
        .tap( ID, ( source, chunk ) => {
          const chunkName = chunk.name
          const modules = chunk.getModules()

          const entries = modules
            .map( module => {
              if ( !module.resource || module.type.startsWith( 'css/' ) ) {
                return false
              }

              const file = module.resource
              const content = module.originalSource && module.originalSource().source()

              if (
                !content ||
                ( content && content.startsWith( '// extracted by mini-css-extract-plugin' ) )
              ) {
                return false
              }

              return {
                file,
                chunkName,
                content,
              }
            } )
            .filter( Boolean )

          const len = entries.length
          for ( let i = 0; i < len; i++ ) {
            const entry = entries[ i ]

            for ( let j = i + 1; j < len; j++ ) {
              const targetEntry = entries[ j ]
              const { score: similarity } = getSimilarity( entry.content, targetEntry.content )
              
              if ( similarity === 1 ) {
                addToClones( clones, entry, entry )
                addToClones( clones, entry, targetEntry )
              } else if ( similarity > 0.8 ) {
                addToClones( maybeClones, entry, entry )
                addToClones( maybeClones, entry, targetEntry )
              }
            }
          }

          debugger

          return source
        } )
    } )

    compiler.hooks.done.tap( ID, () => {
      report( clones )
      reportMaybe( maybeClones )
    } )
  }
}

function report( clones ) {
  for ( let cloneGroup of clones ) {
    if ( cloneGroup.length > 1 ) {
      console.log()
      console.log( 'Clones detected:' )
      console.log( cloneGroup.map( clone => `Chunk(${ clone.chunkName })` + ' ➤ ' + clone.file ).join( '\n' ) )
      console.log()
    }
  }
}

function reportMaybe( clones ) {
  for ( let cloneGroup of clones ) {
    if ( cloneGroup.length > 1 ) {
      console.log()
      console.log( `Clones detected( maybe ):` )
      console.log( cloneGroup.map( clone => `Chunk(${ clone.chunkName })` + ' ➤ ' + clone.file ).join( '\n' ) )
      console.log()
    }
  }
}
