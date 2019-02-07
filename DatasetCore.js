const N3Store = require('./lib/N3Store')

class DatasetCore extends N3Store {
  constructor (quads = []) {
    super(quads)
  }

  [Symbol.iterator] () {
    return this._quads.values()
  }

  get size () {
    return this._quads.size
  }

  add (quad) {
    this._addQuad(quad)
    return this
  }

  delete (quad) {
    this._removeQuad(quad.subject, quad.predicate, quad.object, quad.graph)
    return this
  }

  has (quad) {
    return this._getQuads(quad.subject, quad.predicate, quad.object, quad.graph).length > 0
  }

  match (subject, predicate, object, graph) {
    return new this.constructor(this._getQuads(subject, predicate, object, graph))
  }
}

module.exports = DatasetCore
