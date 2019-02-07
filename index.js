const rdf = require('@rdfjs/data-model')
const Dataset = require('./Dataset')

function dataset (quads) {
  return new Dataset(quads)
}

module.exports = Object.assign({ dataset }, rdf)
