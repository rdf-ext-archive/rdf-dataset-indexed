/* global describe, it */

const assert = require('assert')
if (!assert.hasOwnProperty('strict')) {
  assert.strict = {
    equal: assert.equal, // eslint-disable-line
    deepEqual: assert.deepEqual // eslint-disable-line
  }
}
const rdf = require('@rdfjs/data-model')
const Dataset = require('../index')
const EventEmitter = require('events').EventEmitter

function simpleFilter (subject, predicate, object, graph) {
  return function (quad) {
    return (!subject || quad.subject.equals(subject)) &&
      (!predicate || quad.predicate.equals(predicate)) &&
      (!object || quad.object.equals(object)) &&
      (!graph || quad.graph.equals(graph))
  }
}

describe('Dataset', () => {
  test('should implement the Dataset interface', () => {
    const dataset = new Dataset()

    expect(typeof dataset.length).toBe('number')
    expect(typeof dataset.add).toBe('function')
    expect(typeof dataset.addAll).toBe('function')
    expect(typeof dataset.clone).toBe('function')
    expect(typeof dataset.difference).toBe('function')
    expect(typeof dataset.every).toBe('function')
    expect(typeof dataset.filter).toBe('function')
    expect(typeof dataset.forEach).toBe('function')
    expect(typeof dataset.import).toBe('function')
    expect(typeof dataset.includes).toBe('function')
    expect(typeof dataset.intersection).toBe('function')
    expect(typeof dataset.map).toBe('function')
    expect(typeof dataset.match).toBe('function')
    expect(typeof dataset.merge).toBe('function')
    expect(typeof dataset.remove).toBe('function')
    expect(typeof dataset.removeMatches).toBe('function')
    expect(typeof dataset.some).toBe('function')
    expect(typeof dataset.toArray).toBe('function')
    expect(typeof dataset.toStream).toBe('function')
  })

  test('.length should contain the number of triples in the graph', () => {
    const quad = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('object')
    )

    const dataset = new Dataset([quad])

    expect(dataset.length).toBe(1)
  })

  test('.add should add triples to the graph', () => {
    const quad = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('object')
    )

    const dataset = new Dataset()

    dataset.add(quad)

    expect(quad.equals(dataset.toArray()[0])).toBe(true)
  })

  test('.add should not create duplicates', () => {
    const quad = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('object')
    )

    const dataset = new Dataset()

    dataset.add(quad)
    dataset.add(quad)

    expect(dataset.size).toBe(1)
  })

  test('.add should store a quad as-is (preserving its proto and attrs)', () => {
    const quad = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('object')
    )

    quad.foo = () => 'bar'

    const dataset = new Dataset()

    dataset.add(quad)

    const retrievedQuad = dataset.toArray()[0]
    expect(retrievedQuad.foo()).toBe('bar')
  })

  test('.addAll should import all triples from the given graph', () => {
    const quad1 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('a')
    )

    const quad2 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('b')
    )

    const dataset1 = new Dataset([quad1])
    const dataset2 = new Dataset([quad2])
    const dataset3 = dataset1.addAll(dataset2)

    expect(dataset1.toArray().length).toBe(2)
    expect(dataset2.toArray().length).toBe(1)
    expect(dataset3.toArray().length).toBe(2)
  })

  test('.clone should create a new Dataset instance that contains all quads of the original', () => {
    const quad = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('object')
    )

    const dataset = new Dataset()

    dataset.add(quad)

    const clone = dataset.clone()

    expect(dataset === clone).toBe(false)
    expect(dataset.toArray()[0].equals(clone.toArray()[0])).toBe(true)
  })

  test('.clone should use the factory to create a new Dataset instance', () => {
    const factory = {
      dataset: () => 'test'
    }

    const dataset = new Dataset(null, factory)
    const clone = dataset.clone()

    expect(clone).toBe('test')
  })

  test('.difference should return a dataset with quads not included in the other dataset', () => {
    const quad1 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('a')
    )

    const quad2 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('b')
    )

    const quad3 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('c')
    )

    const dataset1 = new Dataset([quad1, quad2])
    const dataset2 = new Dataset([quad2, quad3])
    const difference = dataset1.difference(dataset2)

    expect(difference.toArray().length).toBe(1)
    expect(quad1.equals(difference.toArray()[0])).toBe(true)
  })

  test('.difference should use the factory to create a new Dataset instance', () => {
    const factory = {
      dataset: () => 'test'
    }

    const dataset1 = new Dataset(null, factory)
    const dataset2 = new Dataset()
    const difference = dataset1.difference(dataset2)

    expect(difference).toBe('test')
  })

  test('.every should return true if every quad pass the filter test', () => {
    const quad1 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('a')
    )

    const quad2 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('b')
    )

    const dataset = new Dataset([quad1, quad2])

    expect(dataset.every(simpleFilter(rdf.namedNode('http://example.org/subject'), null, null))).toBe(true)
    expect(dataset.every(simpleFilter(null, null, rdf.literal('a')))).toBe(false)
  })

  test('.filter should return a new dataset that contains all quads that pass the filter test', () => {
    const quad1 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('a')
    )

    const quad2 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('b')
    )

    const dataset = new Dataset([quad1, quad2])

    expect(dataset.filter(simpleFilter(rdf.namedNode('http://example.org/subject'), null, null)).length).toBe(2)
    expect(dataset.filter(simpleFilter(null, null, rdf.literal('a'))).length).toBe(1)
    expect(dataset.filter(simpleFilter(null, null, rdf.literal('c'))).length).toBe(0)
  })

  test('.filter should use the factory to create a new Dataset instance', () => {
    const factory = {
      dataset: () => 'test'
    }

    const dataset = new Dataset(null, factory)
    const filtered = dataset.filter(() => true)

    expect(filtered).toBe('test')
  })

  test('.forEach should call the callback function for every quad', () => {
    const quad1 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('a')
    )

    const quad2 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('b')
    )

    const dataset = new Dataset([quad1, quad2])

    const objects = []

    dataset.forEach((quad) => {
      objects.push(quad.object.value)
    })

    expect(objects.length).toBe(2)
    assert.strict.deepEqual(objects, ['a', 'b'])
  })

  test('.import should import quads from stream', () => {
    const stream = new EventEmitter()
    const dataset = new Dataset()
    const quad1 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('a'))

    const quad2 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('b'))

    const result = dataset.import(stream)

    stream.emit('data', quad1)
    stream.emit('data', quad2)
    stream.emit('end')

    return result.then(() => {
      expect(quad1.equals(dataset.toArray()[0])).toBe(true)
      expect(quad2.equals(dataset.toArray()[1])).toBe(true)
    })
  })

  test('.import should forward stream errors', () => {
    const stream = new EventEmitter()
    const dataset = new Dataset()

    const result = dataset.import(stream)

    stream.emit('error', new Error('example'))

    return new Promise((resolve, reject) => {
      result.then(() => {
        reject(new Error('no error thrown'))
      }).catch(() => {
        resolve()
      })
    })
  })

  test('.includes should test if the dataset contains the given quad', () => {
    const quad1 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('a'))

    const quad2 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('b'))

    const dataset = new Dataset([quad1])

    expect(dataset.includes(quad1)).toBe(true)
    expect(dataset.includes(quad2)).toBe(false)
  })

  test('.intersection should return a dataset with quads included also in the other dataset', () => {
    const quad1 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('a'))

    const quad2 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('b'))

    const quad3 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('c'))

    const dataset1 = new Dataset([quad1, quad2])
    const dataset2 = new Dataset([quad2, quad3])
    const intersection = dataset1.intersection(dataset2)

    expect(intersection.toArray().length).toBe(1)
    expect(quad2.equals(intersection.toArray()[0])).toBe(true)
  })

  test('.intersection should use the factory to create a new Dataset instance', () => {
    const factory = {
      dataset: () => 'test'
    }

    const dataset1 = new Dataset(null, factory)
    const dataset2 = new Dataset(null, factory)
    const intersection = dataset1.intersection(dataset2)

    expect(intersection).toBe('test')
  })

  test('.map should call the callback function for every quad and return a Dataset that contains the new quads', () => {
    const quad = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('a')
    )

    const mappedQuad = rdf.quad(quad.subject, quad.predicate, rdf.literal('a1'))

    const dataset = new Dataset([quad])

    const mappedDataset = dataset.map((q) => {
      return rdf.quad(q.subject, q.predicate, rdf.literal(`${q.object.value}1`))
    })

    expect(mappedDataset.length).toBe(1)
    expect(mappedQuad.equals(mappedDataset.toArray()[0])).toBe(true)
  })

  test('.map should use the factory to create a new Dataset instance', () => {
    const factory = {
      dataset: () => 'test'
    }

    const dataset = new Dataset(null, factory)
    const mapped = dataset.map(quad => quad)

    expect(mapped).toBe('test')
  })

  test('.match should return a new dataset that contains all quads that pass the subject match pattern', () => {
    const subject1 = rdf.namedNode('http://example.org/subject1')
    const subject2 = rdf.namedNode('http://example.org/subject2')
    const predicate = rdf.namedNode('http://example.org/predicate')
    const object = rdf.namedNode('http://example.org/object')
    const graph = rdf.namedNode('http://example.org/graph')
    const quad1 = rdf.quad(subject1, predicate, object, graph)
    const quad2 = rdf.quad(subject2, predicate, object, graph)
    const dataset = new Dataset([quad1, quad2])

    expect(dataset.match(rdf.namedNode('http://example.org/subject1'), null, null, null).length).toBe(1)
    expect(dataset.match(rdf.namedNode('http://example.org/subject2'), null, null, null).length).toBe(1)
    expect(dataset.match(rdf.namedNode('http://example.org/subject3'), null, null, null).length).toBe(0)
  })

  test('.match should return a new dataset that contains all quads that pass the predicate match pattern', () => {
    const subject = rdf.namedNode('http://example.org/subject')
    const predicate1 = rdf.namedNode('http://example.org/predicate1')
    const predicate2 = rdf.namedNode('http://example.org/predicate2')
    const object = rdf.namedNode('http://example.org/object')
    const graph = rdf.namedNode('http://example.org/graph')
    const quad1 = rdf.quad(subject, predicate1, object, graph)
    const quad2 = rdf.quad(subject, predicate2, object, graph)
    const dataset = new Dataset([quad1, quad2])

    expect(dataset.match(null, rdf.namedNode('http://example.org/predicate1'), null, null).length).toBe(1)
    expect(dataset.match(null, rdf.namedNode('http://example.org/predicate2'), null, null).length).toBe(1)
    expect(dataset.match(null, rdf.namedNode('http://example.org/predicate3'), null, null).length).toBe(0)
  })

  test('.match should return a new dataset that contains all quads that pass the object match pattern', () => {
    const subject = rdf.namedNode('http://example.org/subject')
    const predicate = rdf.namedNode('http://example.org/predicate')
    const object1 = rdf.namedNode('http://example.org/object1')
    const object2 = rdf.namedNode('http://example.org/object2')
    const graph = rdf.namedNode('http://example.org/graph')
    const quad1 = rdf.quad(subject, predicate, object1, graph)
    const quad2 = rdf.quad(subject, predicate, object2, graph)
    const dataset = new Dataset([quad1, quad2])

    expect(dataset.match(null, null, rdf.namedNode('http://example.org/object1'), null).length).toBe(1)
    expect(dataset.match(null, null, rdf.namedNode('http://example.org/object2'), null).length).toBe(1)
    expect(dataset.match(null, null, rdf.namedNode('http://example.org/object3'), null).length).toBe(0)
  })

  test('.match should return a new dataset that contains all quads that pass the graph match pattern', () => {
    const subject = rdf.namedNode('http://example.org/subject')
    const predicate = rdf.namedNode('http://example.org/predicate')
    const object = rdf.namedNode('http://example.org/object')
    const graph1 = rdf.namedNode('http://example.org/graph1')
    const graph2 = rdf.namedNode('http://example.org/graph2')
    const quad1 = rdf.quad(subject, predicate, object, graph1)
    const quad2 = rdf.quad(subject, predicate, object, graph2)
    const dataset = new Dataset([quad1, quad2])

    expect(dataset.match(null, null, null, rdf.namedNode('http://example.org/graph1')).length).toBe(1)
    expect(dataset.match(null, null, null, rdf.namedNode('http://example.org/graph2')).length).toBe(1)
    expect(dataset.match(null, null, null, rdf.namedNode('http://example.org/graph3')).length).toBe(0)
  })

  test('.match should use the factory to create a new Dataset instance', () => {
    const factory = {
      dataset: () => 'test'
    }

    const dataset = new Dataset(null, factory)
    const matched = dataset.match()

    expect(matched).toBe('test')
  })

  test('.merge should return a new graph that contains all triples from the graph object and the given graph', () => {
    const quad1 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('a'))

    const quad2 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('b'))

    const dataset1 = new Dataset([quad1])
    const dataset2 = new Dataset([quad2])
    const dataset3 = dataset1.merge(dataset2)

    expect(dataset1.toArray().length).toBe(1)
    expect(dataset2.toArray().length).toBe(1)
    expect(dataset3.toArray().length).toBe(2)
  })

  test('.remove should remove the given triple', () => {
    const quad = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('object')
    )
    const dataset = new Dataset([quad])

    dataset.remove(quad)

    expect(dataset.toArray().length).toBe(0)
  })

  test('.removeMatches should remove all quads that pass the subject match pattern and return the dataset itself', () => {
    const subject1 = rdf.namedNode('http://example.org/subject1')
    const subject2 = rdf.namedNode('http://example.org/subject2')
    const predicate = rdf.namedNode('http://example.org/predicate')
    const object = rdf.namedNode('http://example.org/object')
    const graph = rdf.namedNode('http://example.org/graph')
    const quad1 = rdf.quad(subject1, predicate, object, graph)
    const quad2 = rdf.quad(subject2, predicate, object, graph)
    const dataset = new Dataset([quad1, quad2])

    expect(dataset.removeMatches(rdf.namedNode('http://example.org/subject3'), null, null, null).length).toBe(2)
    expect(dataset.removeMatches(rdf.namedNode('http://example.org/subject2'), null, null, null).length).toBe(1)
    expect(dataset.removeMatches(rdf.namedNode('http://example.org/subject1'), null, null, null).length).toBe(0)
  })

  test('.removeMatches should remove all quads that pass the predicate match pattern and return the dataset itself', () => {
    const subject = rdf.namedNode('http://example.org/subject')
    const predicate1 = rdf.namedNode('http://example.org/predicate1')
    const predicate2 = rdf.namedNode('http://example.org/predicate2')
    const object = rdf.namedNode('http://example.org/object')
    const graph = rdf.namedNode('http://example.org/graph')
    const quad1 = rdf.quad(subject, predicate1, object, graph)
    const quad2 = rdf.quad(subject, predicate2, object, graph)
    const dataset = new Dataset([quad1, quad2])

    expect(dataset.removeMatches(null, rdf.namedNode('http://example.org/predicate3'), null, null).length).toBe(2)
    expect(dataset.removeMatches(null, rdf.namedNode('http://example.org/predicate2'), null, null).length).toBe(1)
    expect(dataset.removeMatches(null, rdf.namedNode('http://example.org/predicate1'), null, null).length).toBe(0)
  })

  test('.removeMatches should remove all quads that pass the object match pattern and return the dataset itself', () => {
    const subject = rdf.namedNode('http://example.org/subject')
    const predicate = rdf.namedNode('http://example.org/predicate')
    const object1 = rdf.namedNode('http://example.org/object1')
    const object2 = rdf.namedNode('http://example.org/object2')
    const graph = rdf.namedNode('http://example.org/graph')
    const quad1 = rdf.quad(subject, predicate, object1, graph)
    const quad2 = rdf.quad(subject, predicate, object2, graph)
    const dataset = new Dataset([quad1, quad2])

    expect(dataset.removeMatches(null, null, rdf.namedNode('http://example.org/object3'), null).length).toBe(2)
    expect(dataset.removeMatches(null, null, rdf.namedNode('http://example.org/object2'), null).length).toBe(1)
    expect(dataset.removeMatches(null, null, rdf.namedNode('http://example.org/object1'), null).length).toBe(0)
  })

  test('.removeMatches should remove all quads that pass the graph match pattern and return the dataset itself', () => {
    const subject = rdf.namedNode('http://example.org/subject')
    const predicate = rdf.namedNode('http://example.org/predicate')
    const object = rdf.namedNode('http://example.org/object')
    const graph1 = rdf.namedNode('http://example.org/graph1')
    const graph2 = rdf.namedNode('http://example.org/graph2')
    const quad1 = rdf.quad(subject, predicate, object, graph1)
    const quad2 = rdf.quad(subject, predicate, object, graph2)
    const dataset = new Dataset([quad1, quad2])

    expect(dataset.removeMatches(null, null, null, rdf.namedNode('http://example.org/graph3')).length).toBe(2)
    expect(dataset.removeMatches(null, null, null, rdf.namedNode('http://example.org/graph2')).length).toBe(1)
    expect(dataset.removeMatches(null, null, null, rdf.namedNode('http://example.org/graph1')).length).toBe(0)
  })

  test('.some should return true if any quad pass the filter test', () => {
    const quad1 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('a'))

    const quad2 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('b'))

    const dataset = new Dataset([quad1, quad2])

    expect(dataset.some(simpleFilter(rdf.namedNode('http://example.org/subject'), null, null))).toBe(true)
    expect(dataset.some(simpleFilter(rdf.namedNode('http://example.org/subject1'), null, null))).toBe(false)
  })

  test('.toArray should return all quads in an array', () => {
    const quad1 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('a'))

    const quad2 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('b'))

    const dataset = new Dataset([quad1, quad2])
    const array = dataset.toArray()

    assert(quad1.equals(array[0]))
    assert(quad2.equals(array[1]))
  })

  test('.toStream should return a stream which emits all quads of the dataset', () => {
    const quads = [rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.blankNode()
    )]

    const dataset = new Dataset(quads)

    const stream = dataset.toStream()
    const output = []

    return new Promise((resolve, reject) => {
      stream.on('end', () => {
        if (output.length === 1 && quads[0].equals(output[0])) {
          resolve()
        } else {
          reject(new Error('no quads emitted'))
        }
      })

      stream.on('error', reject)

      stream.on('data', (quad) => {
        output.push(quad)
      })
    })
  })
})
