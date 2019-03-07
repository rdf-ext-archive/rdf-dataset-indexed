const Readable = require('readable-stream')
const DatasetCore = require('./DatasetCore')

class Dataset extends DatasetCore {
  constructor (quads = []) {
    super(quads)
  }

  addAll (quads) {
    this._addQuads(quads)
    return this
  }

  contains (otherDataset) {
    if (otherDataset.size > this.size) {
      return false
    }
    // b.intersection(a) should faster that a.intersection(b) since b.size < a.size
    return otherDataset.intersection(this).equals(otherDataset)
  }

  deleteMatches (subject, predicate, object, graph) {
    const remove = (quad) => {
      this._removeQuad(quad)
    }
    this._forEach(remove, subject, predicate, object, graph)

    return this
  }

  difference (other) {
    return this.filter((quad) => !other.has(quad))
  }

  equals (otherDataset) {
    if (this.size !== otherDataset.size) {
      return false
    }
    const intersection = otherDataset.intersection(this)
    if (intersection.size !== this.size) {
      return false
    }
    const union = otherDataset.union(this)
    return union.size === this.size
  }

  filter (iteratee) {
    const filteredQuads = this.toArray().filter((quad) => iteratee(quad, this))
    return new this.constructor(filteredQuads)
  }

  forEach (iteratee) {
    this._forEach(iteratee)
  }

  import (stream) {
    return new Promise((resolve, reject) => {
      this._import(stream).on('end', () => resolve(this)).on('error', err => reject(err))
    })
  }

  intersection (other) {
    return this.filter((quad) => other.has(quad))
  }

  map (iteratee) {
    return new this.constructor(this.toArray().map((quad) => iteratee(quad, this)))
  }

  reduce (iteratee, acc) {
    for (const quad of this) {
      acc = iteratee(acc, quad)
    }
    return acc
  }

  some (iteratee) {
    return this._some(iteratee)
  }

  toArray () {
    return Array.from(this._quads.values())
  }

  toCanonical () {
    throw new Error('not implemented! (TODO)')
  }

  toStream () {
    const stream = new Readable({
      objectMode: true,
      read: () => {
        this.forEach((quad) => {
          stream.push(quad)
        })

        stream.push(null)
      }
    })

    return stream
  }

  toString () {
    throw new Error('not implemented! (TODO)')
  }

  union (other) {
    return new this.constructor(this.toArray()).addAll(other)
  }
}

module.exports = Dataset
