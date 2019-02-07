/* eslint max-len: [2, 150] */
// **N3Store** objects store N3 quads by graph in memory.

const DataFactory = require('@rdfjs/data-model')
const utils = require('./utils')
const toId = utils.toId

const fromId = utils.fromId

// ## Constructor
function N3Store (quads, options) {
  if (!(this instanceof N3Store)) {
    return new N3Store(quads, options)
  }

  // `_graphs` contains subject, predicate, and object indexes per graph
  this._graphs = Object.create(null)
  this._quads = new Map()
  // `_ids` maps entities such as `http://xmlns.com/foaf/0.1/name` to numbers,
  // saving memory by using only numbers as keys in `_graphs`
  this._id = 0
  this._ids = Object.create(null)
  this._ids['><'] = 0 // dummy entry, so the first actual key is non-zero
  this._entities = Object.create(null) // inverse of `_ids`
  // `_blankNodeIndex` is the index of the last automatically named blank node
  this._blankNodeIndex = 0

  // Shift parameters if `quads` is not given
  if (!options && quads && !quads[0]) {
    options = quads
    quads = null
  }
  options = options || {}
  this._factory = options.factory || DataFactory

  // Add quads if passed
  if (quads) {
    this._addQuads(quads)
  }
}

N3Store.prototype = {
  // ## Public properties

  // ### `size` returns the number of quads in the store
  get size () {
    return this._quads.size
  },

  // ## Private methods

  // ### `__addToIndex` adds a quad to a three-layered index.
  // Returns if the index has changed, if the entry did not already exist.
  __addToIndex (index0, key0, key1, key2) {
    // Create layers as necessary
    const index1 = index0[key0] || (index0[key0] = Object.create(null))
    const index2 = index1[key1] || (index1[key1] = Object.create(null))
    // Setting the key to _any_ value signals the presence of the quad
    const existed = key2 in index2
    if (!existed) {
      index2[key2] = null
    }
    return !existed
  },

  // ### `__removeFromIndex` removes a quad from a three-layered index
  __removeFromIndex (index0, key0, key1, key2) {
    // Remove the quad from the index
    const index1 = index0[key0]
    const index2 = index1[key1]
    let key
    delete index2[key2]

    // Remove intermediary index layers if they are empty
    for (key in index2) return
    delete index1[key1]
    for (key in index1) return
    delete index0[key0]
  },

  // ### `__findInIndex` finds a set of quads in a three-layered index.
  // The index base is `index0` and the keys at each level are `key0`, `key1`, and `key2`.
  // Any of these keys can be undefined, which is interpreted as a wildcard.
  // `name0`, `name1`, and `name2` are the names of the keys at each level,
  // used when reconstructing the resulting quad
  // (for instance: _subject_, _predicate_, and _object_).
  // Finally, `graph` will be the graph of the created quads.
  // If `iteratee` is given, each result is passed through it
  // and iteration halts when it returns truthy for any quad.
  // If instead `array` is given, each result is added to the array.
  __findInIndex (index0, key0, key1, key2, name0, name1, name2, graph, iteratee, array) {
    let tmp
    let index1
    let index2
    const varCount = !key0 + !key1 + !key2

    // depending on the number of variables, keys or reverse index are faster

    const entityKeys = varCount > 1 ? Object.keys(this._ids) : this._entities

    // If a key is specified, use only that part of index 0.
    if (key0) {
      tmp = index0
      index0 = {}
      index0[key0] = tmp[key0]
    }
    for (const value0 in index0) {
      const entity0 = entityKeys[value0]

      index1 = index0[value0]
      if (index1) {
        // If a key is specified, use only that part of index 1.
        if (key1) {
          tmp = index1
          index1 = {}
          index1[key1] = tmp[key1]
        }
        for (const value1 in index1) {
          const entity1 = entityKeys[value1]

          index2 = index1[value1]
          if (index2) {
            // If a key is specified, use only that part of index 2, if it exists.
            const values = key2 ? (key2 in index2 ? [key2] : []) : Object.keys(index2)
            // Create quads for all items found in index 2.
            for (let l = 0; l < values.length; l++) {
              const parts = { subject: null, predicate: null, object: null }
              parts[name0] = fromId(entity0, this._factory)
              parts[name1] = fromId(entity1, this._factory)
              parts[name2] = fromId(entityKeys[values[l]], this._factory)

              const mapIndex = {
                [name0]: value0,
                [name1]: value1,
                [name2]: values[l]
              }
              const quad = this._quads.get(`${graph}:::${mapIndex.subject}::${mapIndex.predicate}::${mapIndex.object}`)
              if (array) {
                array.push(quad)
              } else if (iteratee(quad)) {
                return true
              }
            }
          }
        }
      }
    }
    return array
  },

  // ### `__loop` executes the iteratee on all keys of index 0
  __loop (index0, iteratee) {
    for (const key0 in index0) {
      iteratee(key0)
    }
  },

  // ### `__loopByKey0` executes the iteratee on all keys of a certain entry in index 0
  __loopByKey0 (index0, key0, iteratee) {
    const index1 = index0[key0]; let key1
    if (index1) {
      for (key1 in index1) {
        iteratee(key1)
      }
    }
  },

  // ### `__loopByKey1` executes the iteratee on given keys of all entries in index 0
  __loopByKey1 (index0, key1, iteratee) {
    let key0, index1
    for (key0 in index0) {
      index1 = index0[key0]
      if (index1[key1]) {
        iteratee(key0)
      }
    }
  },

  // ### `__loopBy2Keys` executes the iteratee on given keys of certain entries in index 2
  __loopBy2Keys (index0, key0, key1, iteratee) {
    let index1, index2, key2
    if ((index1 = index0[key0]) && (index2 = index1[key1])) {
      for (key2 in index2) {
        iteratee(key2)
      }
    }
  },

  // ### `__countInIndex` counts matching quads in a three-layered index.
  // The index base is `index0` and the keys at each level are `key0`, `key1`, and `key2`.
  // Any of these keys can be undefined, which is interpreted as a wildcard.
  __countInIndex (index0, key0, key1, key2) {
    let count = 0
    let tmp
    let index1
    let index2

    // If a key is specified, count only that part of index 0
    if (key0) {
      tmp = index0
      index0 = {}
      index0[key0] = tmp[key0]
    }
    for (const value0 in index0) {
      index1 = index0[value0]
      if (index1) {
        // If a key is specified, count only that part of index 1
        if (key1) {
          tmp = index1
          index1 = {}
          index1[key1] = tmp[key1]
        }
        for (const value1 in index1) {
          index2 = index1[value1]
          if (index2) {
            // If a key is specified, count the quad if it exists
            if (key2) {
              if (key2 in index2) {
                count++
              }
            } else {
              // Otherwise, count all quads
              count += Object.keys(index2).length
            }
          }
        }
      }
    }
    return count
  },

  // ### `__getGraphs` returns an array with the given graph,
  // or all graphs if the argument is null or undefined.
  __getGraphs (graph) {
    if (!isString(graph)) {
      return this._graphs
    }
    const graphs = {}
    graphs[graph] = this._graphs[graph]
    return graphs
  },

  // ### `__uniqueEntities` returns a function that accepts an entity ID
  // and passes the corresponding entity to callback if it hasn't occurred before.
  __uniqueEntities (callback) {
    const uniqueIds = Object.create(null)
    const entities = this._entities
    return function (id) {
      if (!(id in uniqueIds)) {
        uniqueIds[id] = true
        return callback(fromId(entities[id]))
      }
    }
  },

  // ## Public methods

  // ### `_addQuad` adds a new quad to the store.
  // Returns if the quad index has changed, if the quad did not already exist.
  _addQuad (quad) {
    if (arguments.length === 3 || arguments.length === 4) throw new Error('addQuad expects a Quad object')

    // Convert terms to internal string representation
    const graph = toId(quad.graph)
    let object = toId(quad.object)
    let predicate = toId(quad.predicate)
    let subject = toId(quad.subject)

    // Find the graph that will contain the triple
    let graphItem = this._graphs[graph]
    // Create the graph if it doesn't exist yet
    if (!graphItem) {
      graphItem = this._graphs[graph] = { subjects: {}, predicates: {}, objects: {} }
      // Freezing a graph helps subsequent `add` performance,
      // and properties will never be modified anyway
      Object.freeze(graphItem)
    }

    // Since entities can often be long IRIs, we avoid storing them in every index.
    // Instead, we have a separate index that maps entities to numbers,
    // which are then used as keys in the other indexes.
    const ids = this._ids
    const entities = this._entities
    subject = ids[subject] || (ids[entities[++this._id] = subject] = this._id)
    predicate = ids[predicate] || (ids[entities[++this._id] = predicate] = this._id)
    object = ids[object] || (ids[entities[++this._id] = object] = this._id)

    const changed = this.__addToIndex(graphItem.subjects, subject, predicate, object)
    this.__addToIndex(graphItem.predicates, predicate, object, subject)
    this.__addToIndex(graphItem.objects, object, subject, predicate)

    this._quads.set(`${graph}:::${subject}::${predicate}::${object}`, quad)

    return changed
  },

  // ### `_addQuads` adds multiple quads to the store
  _addQuads (quadsArrayOrDataset) {
    let quadsArray
    if (Array.isArray(quadsArrayOrDataset)) {
      quadsArray = quadsArrayOrDataset
    } else {
      quadsArray = quadsArrayOrDataset.toArray()
    }

    for (const quad of quadsArray) {
      this._addQuad(quad)
    }
  },

  // ### `_import` adds a stream of quads to the store
  _import (stream) {
    const self = this
    stream.on('data', function (quad) {
      self._addQuad(quad)
    })
    return stream
  },

  // ### `_removeQuad` removes a quad from the store if it exists
  _removeQuad (subject, predicate, object, graph) {
    // Shift arguments if a quad object is given instead of components
    if (!predicate) {
      graph = subject.graph
      object = subject.object
      predicate = subject.predicate
      subject = subject.subject
    }

    // Convert terms to internal string representation
    subject = toId(subject)
    predicate = toId(predicate)
    object = toId(object)
    graph = toId(graph)

    // Find internal identifiers for all components
    // and verify the quad exists.
    let graphItem
    const ids = this._ids
    const graphs = this._graphs
    let subjects
    let predicates
    if (!(subject = ids[subject]) || !(predicate = ids[predicate]) ||
        !(object = ids[object]) || !(graphItem = graphs[graph]) ||
        !(subjects = graphItem.subjects[subject]) ||
        !(predicates = subjects[predicate]) ||
        !(object in predicates)) {
      return false
    }

    // Remove it from all indexes
    this.__removeFromIndex(graphItem.subjects, subject, predicate, object)
    this.__removeFromIndex(graphItem.predicates, predicate, object, subject)
    this.__removeFromIndex(graphItem.objects, object, subject, predicate)
    this._quads.delete(`${graph}:::${subject}::${predicate}::${object}`)

    // Remove the graph if it is empty
    for (subject in graphItem.subjects) return true
    delete graphs[graph]
    return true
  },

  // ### `_removeQuads` removes multiple quads from the store
  _removeQuads (quads) {
    for (let i = 0; i < quads.length; i++) {
      this._removeQuad(quads[i])
    }
  },

  // ### `remove` removes a stream of quads from the store
  _remove (stream) {
    const self = this
    stream.on('data', function (quad) {
      self._removeQuad(quad)
    })
    return stream
  },

  // ### `_getQuads` returns an array of quads matching a pattern.
  // Setting any field to `undefined` or `null` indicates a wildcard.
  _getQuads (subject, predicate, object, graph) {
    // Convert terms to internal string representation
    subject = subject && toId(subject)
    predicate = predicate && toId(predicate)
    object = object && toId(object)
    graph = graph && toId(graph)

    const quads = []
    const graphs = this.__getGraphs(graph)
    let content

    const ids = this._ids
    let subjectId
    let predicateId
    let objectId

    // Translate IRIs to internal index keys.
    if ((isString(subject) && !(subjectId = ids[subject])) ||
        (isString(predicate) && !(predicateId = ids[predicate])) ||
        (isString(object) && !(objectId = ids[object]))) {
      return quads
    }

    for (const graphId in graphs) {
      // Only if the specified graph contains triples, there can be results
      content = graphs[graphId]
      if (content) {
        // Choose the optimal index, based on what fields are present
        if (subjectId) {
          if (objectId) {
            // If subject and object are given, the object index will be the fastest
            this.__findInIndex(content.objects, objectId, subjectId, predicateId,
              'object', 'subject', 'predicate', graphId, null, quads)
          } else {
            // If only subject and possibly predicate are given, the subject index will be the fastest
            this.__findInIndex(content.subjects, subjectId, predicateId, null,
              'subject', 'predicate', 'object', graphId, null, quads)
          }
        } else if (predicateId) {
          // If only predicate and possibly object are given, the predicate index will be the fastest
          this.__findInIndex(content.predicates, predicateId, objectId, null,
            'predicate', 'object', 'subject', graphId, null, quads)
        } else if (objectId) {
          // If only object is given, the object index will be the fastest
          this.__findInIndex(content.objects, objectId, null, null,
            'object', 'subject', 'predicate', graphId, null, quads)
        } else {
          // If nothing is given, iterate subjects and predicates first
          this.__findInIndex(content.subjects, null, null, null,
            'subject', 'predicate', 'object', graphId, null, quads)
        }
      }
    }
    return quads
  },

  // ### `_countQuads` returns the number of quads matching a pattern.
  // Setting any field to `undefined` or `null` indicates a wildcard.
  _countQuads (subject, predicate, object, graph) {
    // Convert terms to internal string representation
    subject = subject && toId(subject)
    predicate = predicate && toId(predicate)
    object = object && toId(object)
    graph = graph && toId(graph)

    let count = 0
    const graphs = this.__getGraphs(graph)
    let content

    const ids = this._ids
    let subjectId
    let predicateId
    let objectId

    // Translate IRIs to internal index keys.
    if ((isString(subject) && !(subjectId = ids[subject])) ||
        (isString(predicate) && !(predicateId = ids[predicate])) ||
        (isString(object) && !(objectId = ids[object]))) {
      return 0
    }

    for (const graphId in graphs) {
      // Only if the specified graph contains triples, there can be results
      content = graphs[graphId]
      if (content) {
        // Choose the optimal index, based on what fields are present
        if (subject) {
          if (object) {
          // If subject and object are given, the object index will be the fastest
            count += this.__countInIndex(content.objects, objectId, subjectId, predicateId)
          } else {
          // If only subject and possibly predicate are given, the subject index will be the fastest
            count += this.__countInIndex(content.subjects, subjectId, predicateId, objectId)
          }
        } else if (predicate) {
          // If only predicate and possibly object are given, the predicate index will be the fastest
          count += this.__countInIndex(content.predicates, predicateId, objectId, subjectId)
        } else {
          // If only object is possibly given, the object index will be the fastest
          count += this.__countInIndex(content.objects, objectId, subjectId, predicateId)
        }
      }
    }
    return count
  },

  // ### `_forEach` executes the iteratee on all quads.
  // Setting any field to `undefined` or `null` indicates a wildcard.
  _forEach (iteratee, subject, predicate, object, graph) {
    this._some(function (quad) {
      iteratee(quad)
      return false
    }, subject, predicate, object, graph)
  },

  // ### `_every` executes the iteratee on all quads,
  // and returns `true` if it returns truthy for all them.
  // Setting any field to `undefined` or `null` indicates a wildcard.
  _every (iteratee, subject, predicate, object, graph) {
    let some = false
    const every = !this._some(function (quad) {
      some = true
      return !iteratee(quad)
    }, subject, predicate, object, graph)
    return some && every
  },

  // ### `some` executes the iteratee on all quads,
  // and returns `true` if it returns truthy for any of them.
  // Setting any field to `undefined` or `null` indicates a wildcard.
  _some (iteratee, subject, predicate, object, graph) {
    // Convert terms to internal string representation
    subject = subject && toId(subject)
    predicate = predicate && toId(predicate)
    object = object && toId(object)
    graph = graph && toId(graph)

    const graphs = this.__getGraphs(graph)
    let content

    const ids = this._ids
    let subjectId
    let predicateId
    let objectId

    // Translate IRIs to internal index keys.
    if ((isString(subject) && !(subjectId = ids[subject])) ||
        (isString(predicate) && !(predicateId = ids[predicate])) ||
        (isString(object) && !(objectId = ids[object]))) {
      return false
    }

    for (const graphId in graphs) {
      // Only if the specified graph contains triples, there can be results
      content = graphs[graphId]
      if (content) {
        // Choose the optimal index, based on what fields are present
        if (subjectId) {
          if (objectId) {
            // If subject and object are given, the object index will be the fastest
            if (this.__findInIndex(content.objects, objectId, subjectId, predicateId, 'object', 'subject', 'predicate', graphId, iteratee, null)) {
              return true
            }
          } else if (this.__findInIndex(content.subjects, subjectId, predicateId, null, 'subject', 'predicate', 'object', graphId, iteratee, null)) {
            // If only subject and possibly predicate are given, the subject index will be the fastest
            return true
          }
        } else if (predicateId) {
          // If only predicate and possibly object are given, the predicate index will be the fastest
          if (this.__findInIndex(content.predicates, predicateId, objectId, null, 'predicate', 'object', 'subject', graphId, iteratee, null)) {
            return true
          }
        } else if (objectId) {
          // If only object is given, the object index will be the fastest
          if (this.__findInIndex(content.objects, objectId, null, null, 'object', 'subject', 'predicate', graphId, iteratee, null)) {
            return true
          }
        } else if (this.__findInIndex(content.subjects, null, null, null, 'subject', 'predicate', 'object', graphId, iteratee, null)) {
          // If nothing is given, iterate subjects and predicates first
          return true
        }
      }
    }
    return false
  },

  // ### `_getSubjects` returns all subjects that match the pattern.
  // Setting any field to `undefined` or `null` indicates a wildcard.
  _getSubjects (predicate, object, graph) {
    const results = []
    this._forSubjects(function (s) {
      results.push(s, predicate, object, graph)
    })
    return results
  },

  // ### `_forSubjects` executes the iteratee on all subjects that match the pattern.
  // Setting any field to `undefined` or `null` indicates a wildcard.
  _forSubjects (iteratee, predicate, object, graph) {
    // Convert terms to internal string representation
    predicate = predicate && toId(predicate)
    object = object && toId(object)
    graph = graph && toId(graph)

    const ids = this._ids
    const graphs = this.__getGraphs(graph)
    let content
    let predicateId
    let objectId
    iteratee = this.__uniqueEntities(iteratee)

    // Translate IRIs to internal index keys.
    if (
      (isString(predicate) && !(predicateId = ids[predicate])) ||
      (isString(object) && !(objectId = ids[object]))
    ) {
      return
    }

    for (graph in graphs) {
      // Only if the specified graph contains triples, there can be results
      content = graphs[graph]
      if (content) {
        // Choose optimal index based on which fields are wildcards
        if (predicateId) {
          if (objectId) {
            // If predicate and object are given, the POS index is best.
            this.__loopBy2Keys(content.predicates, predicateId, objectId, iteratee)
          } else {
            // If only predicate is given, the SPO index is best.
            this.__loopByKey1(content.subjects, predicateId, iteratee)
          }
        } else if (objectId) {
          // If only object is given, the OSP index is best.
          this.__loopByKey0(content.objects, objectId, iteratee)
        } else {
          // If no params given, iterate all the subjects
          this.__loop(content.subjects, iteratee)
        }
      }
    }
  },

  // ### `_getPredicates` returns all predicates that match the pattern.
  // Setting any field to `undefined` or `null` indicates a wildcard.
  _getPredicates (subject, object, graph) {
    const results = []
    this._forPredicates(function (p) {
      results.push(p, subject, object, graph)
    })
    return results
  },

  // ### `_forPredicates` executes the iteratee on all predicates that match the pattern.
  // Setting any field to `undefined` or `null` indicates a wildcard.
  _forPredicates (iteratee, subject, object, graph) {
    // Convert terms to internal string representation
    subject = subject && toId(subject)
    object = object && toId(object)
    graph = graph && toId(graph)

    const ids = this._ids
    const graphs = this.__getGraphs(graph)
    let content
    let subjectId
    let objectId
    iteratee = this.__uniqueEntities(iteratee)

    // Translate IRIs to internal index keys.
    if ((isString(subject) && !(subjectId = ids[subject])) ||
        (isString(object) && !(objectId = ids[object]))) {
      return
    }

    for (graph in graphs) {
      // Only if the specified graph contains triples, there can be results
      content = graphs[graph]
      if (content) {
        // Choose optimal index based on which fields are wildcards
        if (subjectId) {
          if (objectId) {
            // If subject and object are given, the OSP index is best.
            this.__loopBy2Keys(content.objects, objectId, subjectId, iteratee)
          } else {
            // If only subject is given, the SPO index is best.
            this.__loopByKey0(content.subjects, subjectId, iteratee)
          }
        } else if (objectId) {
          // If only object is given, the POS index is best.
          this.__loopByKey1(content.predicates, objectId, iteratee)
        } else {
          // If no params given, iterate all the predicates.
          this.__loop(content.predicates, iteratee)
        }
      }
    }
  },

  // ### `_getObjects` returns all objects that match the pattern.
  // Setting any field to `undefined` or `null` indicates a wildcard.
  _getObjects (subject, predicate, graph) {
    const results = []
    this._forObjects(function (o) {
      results.push(o, subject, predicate, graph)
    })
    return results
  },

  // ### `_forObjects` executes the iteratee on all objects that match the pattern.
  // Setting any field to `undefined` or `null` indicates a wildcard.
  _forObjects (iteratee, subject, predicate, graph) {
    // Convert terms to internal string representation
    subject = subject && toId(subject)
    predicate = predicate && toId(predicate)
    graph = graph && toId(graph)

    const ids = this._ids
    const graphs = this.__getGraphs(graph)
    let content
    let subjectId
    let predicateId
    iteratee = this.__uniqueEntities(iteratee)

    // Translate IRIs to internal index keys.
    if (
      (isString(subject) && !(subjectId = ids[subject])) ||
      (isString(predicate) && !(predicateId = ids[predicate]))
    ) {
      return
    }

    for (graph in graphs) {
      // Only if the specified graph contains triples, there can be results
      content = graphs[graph]
      if (content) {
        // Choose optimal index based on which fields are wildcards
        if (subjectId) {
          if (predicateId) {
          // If subject and predicate are given, the SPO index is best.
            this.__loopBy2Keys(content.subjects, subjectId, predicateId, iteratee)
          } else {
          // If only subject is given, the OSP index is best.
            this.__loopByKey1(content.objects, subjectId, iteratee)
          }
        } else if (predicateId) {
        // If only predicate is given, the POS index is best.
          this.__loopByKey0(content.predicates, predicateId, iteratee)
        } else {
        // If no params given, iterate all the objects.
          this.__loop(content.objects, iteratee)
        }
      }
    }
  },

  // ### `_getGraphs` returns all graphs that match the pattern.
  // Setting any field to `undefined` or `null` indicates a wildcard.
  _getGraphs (subject, predicate, object) {
    const results = []
    this._forGraphs(function (g) {
      results.push(g, subject, predicate, object)
    })
    return results
  },

  // ### `_forGraphs` executes the callback on all graphs that match the pattern.
  // Setting any field to `undefined` or `null` indicates a wildcard.
  _forGraphs (callback, subject, predicate, object) {
    for (const graph in this._graphs) {
      this._some(function (quad) {
        callback(quad.graph)
        return true // Halt iteration of some()
      }, subject, predicate, object, graph)
    }
  },

  // ### `_createBlankNode` creates a new blank node, returning its name
  _createBlankNode (suggestedName) {
    let name, index
    // Generate a name based on the suggested name
    if (suggestedName) {
      name = suggestedName = `_:${suggestedName}`
      index = 1
      while (this._ids[name]) {
        name = suggestedName + index++
      }
    } else {
      // Generate a generic blank node name
      do {
        name = `_:b${this._blankNodeIndex++}`
      } while (this._ids[name])
    }
    // Add the blank node to the entities, avoiding the generation of duplicates
    this._ids[name] = ++this._id
    this._entities[this._id] = name
    return this._factory.blankNode(name.substr(2))
  }
}

// Determines whether the argument is a string
function isString (s) {
  return typeof s === 'string' || s instanceof String
}

// ## Exports
module.exports = N3Store
