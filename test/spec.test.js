/* global describe */

const model = require('@rdfjs/data-model')
const dataset = require('..')
const standard = require('@rdfjs/dataset/test')

const rdf = Object.assign({ dataset }, model)

describe('test suite', () => {
  standard(rdf)
})
