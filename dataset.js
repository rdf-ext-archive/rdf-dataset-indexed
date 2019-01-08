const Readable = require('readable-stream')
const N3Store = require('./lib/N3Store')

class Dataset extends N3Store {
  constructor (quads = [], options = {}) {
    super(quads, options)
    this.options = options
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
    return new Dataset(this._getQuads(), this.options)
  }

  difference (other) {
    return new Dataset(this.filter(quad => !other.includes(quad)))
  }

  every (predicate) {
    return this._every(predicate)
  }

  filter (predicate) {
    const filteredQuads = this.toArray().filter(quad => predicate(quad, this))
    return new Dataset(filteredQuads)
  }

  forEach (callback) {
    this._forEach(callback)
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
    return new Dataset(this.filter(quad => other.includes(quad)))
  }

  map (callback) {
    return new Dataset(this.toArray().map(quad => callback(quad, this)))
  }

  match (subject, predicate, object, graph) {
    return this._getQuads(subject, predicate, object, graph)
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
    return this._getQuads()
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
}

module.exports = Dataset
