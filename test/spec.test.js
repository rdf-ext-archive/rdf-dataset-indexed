const model = require('@rdfjs/data-model')
const standard = require('@rdfjs/dataset/test')
const dataset = require('..')

const rdf = Object.assign({ dataset }, model)

describe('test suite', () => {
  standard(rdf)
})
