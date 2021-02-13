const DataFactory = require('@rdfjs/data-model')

const utils = require('../lib/utils')

describe('utils', () => {
  describe('fromId', () => {
    test('variable', () => {
      expect(utils.fromId('?var').value).toEqual('var')
    })

    test('literal', () => {
      expect(utils.fromId('"var"').language).toEqual('')
    })

    test('literal with language', () => {
      expect(utils.fromId('"var"@ga').language).toEqual('ga')
    })

    test('literal with datatype', () => {
      expect(utils.fromId('"var"^^xsd:decimal').datatype.value).toEqual('xsd:decimal')
    })
  })

  describe('toId', () => {
    test('default graph', () => {
      expect(utils.toId(false)).toEqual(utils.DEFAULTGRAPH.value)
    })

    test('variable', () => {
      expect(utils.toId(DataFactory.variable('var'))).toEqual('?var')
    })

    test('unknown term type', () => {
      const unknownType = "unknown type"
      expect(() => utils.toId( {
        termType: unknownType,
        equals: function() { return false }
      })).toThrow(unknownType)
    })

    test('term has ID', () => {
      const termId = "some ID"
      expect(utils.toId( {
        id: termId,
        equals: function() { return false }
      })).toEqual(termId)
    })

    test('literal with language', () => {
      const literal = DataFactory.literal('some text', 'ga')
      expect(utils.toId(literal)).toEqual('"some text"@ga')
    })

    test('literal with no language', () => {
      const literal = DataFactory.literal('some text')
      expect(utils.toId(literal)).toEqual('"some text"')
    })

    test('literal with datatype', () => {
      const literal = DataFactory.literal('some text', DataFactory.namedNode('https://custom-data-type.com/'))
      expect(utils.toId(literal)).toEqual('"some text"^^https://custom-data-type.com/')
    })
  })
})
