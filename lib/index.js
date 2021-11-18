/* eslint-disable no-magic-numbers */
const getSignature = require( 'code-signature' )
const { simhash, similarity } = require( '@biu/simhash' )

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

    // 同维度的因子使用相同权重计算
    function calcHash( factors = [] ) {
      return simhash(
        factors.map( factor => {
          return {
            text: String( factor ),
            weight: 1,
          }
        } )
      )
    }

    function getSimilarity( signA, signB ) {
      const { total, weights } = Object.keys( signA ).map( key => {
        const factorsA = signA[ key ]
        const factorsB = signB[ key ]

        const factorLen = ( factorsA.length + factorsB.length ) / 2

        const hashA = calcHash( factorsA )
        const hashB = calcHash( factorsB )

        return {
          value: similarity( hashA, hashB ),
          // 长度越长，结果可信度越高，提升权重
          weight: factorLen,
        }
      } )
      .filter( v => ( v !== false ) )
      .reduce( ( memo, current ) => {
        memo.total = memo.total + current.value * current.weight
        memo.weights = memo.weights + current.weight
        return memo
      }, {
        total: 0,
        weights: 0,
      } )

      return total / weights
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
              
              const signature = getSignature( content )

              return {
                file,
                chunkName,
                content,
                rawSignature: signature,
                signature: JSON.stringify( signature ),
              }
            } )
            .filter( Boolean )

          const len = entries.length
          for ( let i = 0; i < len; i++ ) {
            const entry = entries[ i ]

            for ( let j = i + 1; j < len; j++ ) {
              const targetEntry = entries[ j ]
              if ( entry.signature === targetEntry.signature ) {
                addToClones( clones, entry, entry )
                addToClones( clones, entry, targetEntry )
              } else if ( getSimilarity( entry.rawSignature, targetEntry.rawSignature ) > 0.8 ) {
                addToClones( maybeClones, entry, entry )
                addToClones( maybeClones, entry, targetEntry )
              }
            }
          }

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
