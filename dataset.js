const DataFactory = require('@rdfjs/data-model')
const Readable = require('readable-stream')
const N3Store = require('./lib/N3Store')

const CombinedFactory = Object.assign({}, DataFactory, {
  dataset: quads => new Dataset(quads, CombinedFactory)
})

class Dataset extends N3Store {
  constructor (quads = [], factory = CombinedFactory) {
    super(quads, { factory })
  }

  create (quads) {
    return this._factory.dataset(quads)
  }

  get length () {
    return this.size
  }

  add (quad) {
    this._addQuad(quad)
    return this
  }

  addAll (quads) {
    this._addQuads(quads)
    return this
  }

  clone () {
    return this.create(this._getQuads())
  }

  delete (quad) {
    return this.remove(quad)
  }

  difference (other) {
    return this.create(this.filter(quad => !other.includes(quad)))
  }

  every (predicate) {
    return this._every(predicate)
  }

  filter (predicate) {
    const filteredQuads = this.toArray().filter(quad => predicate(quad, this))
    return this.create(filteredQuads)
  }

  forEach (callback) {
    this._forEach(callback)
  }

  has (quad) {
    return this.includes(quad)
  }

  import (stream) {
    return new Promise((resolve, reject) => {
      this._import(stream).on('end', () => resolve(this)).on('error', err => reject(err))
    })
  }

  includes (quad) {
    return this._getQuads(quad.subject, quad.predicate, quad.object, quad.graph).length > 0
  }

  intersection (other) {
    return this.create(this.filter(quad => other.includes(quad)))
  }

  map (callback) {
    return this.create(this.toArray().map(quad => callback(quad, this)))
  }

  match (subject, predicate, object, graph) {
    return this.create(this._getQuads(subject, predicate, object, graph))
  }

  merge (other) {
    return (this.clone()).addAll(other)
  }

  remove (quad) {
    this._removeQuad(quad.subject, quad.predicate, quad.object, quad.graph)
    return this
  }

  removeMatches (subject, predicate, object, graph) {
    const remove = (quad) => {
      this._removeQuad(quad)
    }
    this._forEach(remove, subject, predicate, object, graph)

    return this
  }

  some (callback) {
    return this._some(callback)
  }

  toArray () {
    return Array.from(this._quads.values())
  }

  toStream () {
    const stream = new Readable({
      objectMode: true,
      read: () => {
        this.forEach(quad => {
          stream.push(quad)
        })

        stream.push(null)
      }
    })

    return stream
  }

  [Symbol.iterator] () {
    return this._quads.values()
  }
}

module.exports = Dataset
