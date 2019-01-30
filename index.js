const Dataset = require('./dataset')

module.exports = function datasetFactory (quads = [], factory) {
  return new Dataset(quads, factory)
}
