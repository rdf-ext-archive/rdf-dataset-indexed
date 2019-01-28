const Dataset = require('./dataset')

module.exports = function datasetFactory (quads = [], options = {}) {
  return new Dataset(quads, options)
}
