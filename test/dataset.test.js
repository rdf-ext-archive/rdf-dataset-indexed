const EventEmitter = require('events').EventEmitter
const dedent = require('dedent')
const rdf = require('..')

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
    const dataset = rdf.dataset()

    expect(typeof dataset.size).toBe('number')
    expect(typeof dataset.addAll).toBe('function')
    expect(typeof dataset.deleteMatches).toBe('function')
    expect(typeof dataset.difference).toBe('function')
    expect(typeof dataset.equals).toBe('function')
    expect(typeof dataset.filter).toBe('function')
    expect(typeof dataset.forEach).toBe('function')
    expect(typeof dataset.import).toBe('function')
    expect(typeof dataset.intersection).toBe('function')
    expect(typeof dataset.map).toBe('function')
    expect(typeof dataset.reduce).toBe('function')
    expect(typeof dataset.some).toBe('function')
    expect(typeof dataset.toArray).toBe('function')
    expect(typeof dataset.toCanonical).toBe('function')
    expect(typeof dataset.toStream).toBe('function')
    expect(typeof dataset.toString).toBe('function')
    expect(typeof dataset.union).toBe('function')
  })

  test('.size should contain the number of triples in the graph', () => {
    const quad = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('object')
    )

    const dataset = rdf.dataset([quad])

    expect(dataset.size).toBe(1)
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

    const dataset1 = rdf.dataset([quad1])
    const dataset2 = rdf.dataset([quad2])
    const dataset3 = dataset1.addAll(dataset2)

    expect(dataset1.size).toBe(2)
    expect(dataset2.size).toBe(1)
    expect(dataset3.size).toBe(2)
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

    const dataset1 = rdf.dataset([quad1, quad2])
    const dataset2 = rdf.dataset([quad2, quad3])
    const difference = dataset1.difference(dataset2)

    expect(difference.size).toBe(1)
    expect(quad1).toEqual(difference.toArray()[0])
  })

  test('.equals should not test for isomorphism', () => {
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

    const a = rdf.dataset([quad1, quad2, quad3])
    const b = rdf.dataset([quad3, quad2, quad1])

    expect(a.equals(b)).toBe(true)
    expect(b.equals(a)).toBe(true)

    const c = rdf.dataset([quad1, quad2, quad3])
    const d = rdf.dataset([quad3, quad2])
    const e = rdf.dataset([quad1, quad2])
    expect(c.equals(d)).toBe(false)
    expect(d.equals(c)).toBe(false)
    expect(e.equals(d)).toBe(false)
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

    const dataset = rdf.dataset([quad1, quad2])

    expect(dataset.filter(simpleFilter(rdf.namedNode('http://example.org/subject'), null, null)).size).toBe(2)
    expect(dataset.filter(simpleFilter(null, null, rdf.literal('a'))).size).toBe(1)
    expect(dataset.filter(simpleFilter(null, null, rdf.literal('c'))).size).toBe(0)
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

    const dataset = rdf.dataset([quad1, quad2])

    const objects = []

    dataset.forEach((quad) => {
      objects.push(quad.object.value)
    })

    expect(objects.length).toBe(2)
    expect(objects).toEqual(['a', 'b'])
  })

  test('.import should import quads from stream', () => {
    const stream = new EventEmitter()
    const dataset = rdf.dataset()
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
    const dataset = rdf.dataset()

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

  test('.intersection should return a dataset with quads also included in the other dataset', () => {
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

    const dataset1 = rdf.dataset([quad1, quad2])
    const dataset2 = rdf.dataset([quad2, quad3])
    const intersection = dataset1.intersection(dataset2)

    expect(intersection.size).toBe(1)
    expect(quad2).toEqual(intersection.toArray()[0])
  })

  test('.map should call the callback function for every quad and return a Dataset that contains the new quads', () => {
    const quad = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('a')
    )

    const mappedQuad = rdf.quad(quad.subject, quad.predicate, rdf.literal('a1'))

    const dataset = rdf.dataset([quad])

    const mappedDataset = dataset.map((q) => {
      return rdf.quad(q.subject, q.predicate, rdf.literal(`${q.object.value}1`))
    })

    expect(mappedDataset.size).toBe(1)
    expect(mappedQuad).toEqual(mappedDataset.toArray()[0])
  })

  test('.match should return a new dataset that contains all quads that pass the subject match pattern', () => {
    const subject1 = rdf.namedNode('http://example.org/subject1')
    const subject2 = rdf.namedNode('http://example.org/subject2')
    const predicate = rdf.namedNode('http://example.org/predicate')
    const object = rdf.namedNode('http://example.org/object')
    const graph = rdf.namedNode('http://example.org/graph')
    const quad1 = rdf.quad(subject1, predicate, object, graph)
    const quad2 = rdf.quad(subject2, predicate, object, graph)
    const dataset = rdf.dataset([quad1, quad2])

    expect(dataset.match(rdf.namedNode('http://example.org/subject1'), null, null, null).size).toBe(1)
    expect(dataset.match(rdf.namedNode('http://example.org/subject2'), null, null, null).size).toBe(1)
    expect(dataset.match(rdf.namedNode('http://example.org/subject3'), null, null, null).size).toBe(0)
  })

  test('.match should return a new dataset that contains all quads that pass the predicate match pattern', () => {
    const subject = rdf.namedNode('http://example.org/subject')
    const predicate1 = rdf.namedNode('http://example.org/predicate1')
    const predicate2 = rdf.namedNode('http://example.org/predicate2')
    const object = rdf.namedNode('http://example.org/object')
    const graph = rdf.namedNode('http://example.org/graph')
    const quad1 = rdf.quad(subject, predicate1, object, graph)
    const quad2 = rdf.quad(subject, predicate2, object, graph)
    const dataset = rdf.dataset([quad1, quad2])

    expect(dataset.match(null, rdf.namedNode('http://example.org/predicate1'), null, null).size).toBe(1)
    expect(dataset.match(null, rdf.namedNode('http://example.org/predicate2'), null, null).size).toBe(1)
    expect(dataset.match(null, rdf.namedNode('http://example.org/predicate3'), null, null).size).toBe(0)
  })

  test('.match should return a new dataset that contains all quads that pass the object match pattern', () => {
    const subject = rdf.namedNode('http://example.org/subject')
    const predicate = rdf.namedNode('http://example.org/predicate')
    const object1 = rdf.namedNode('http://example.org/object1')
    const object2 = rdf.namedNode('http://example.org/object2')
    const graph = rdf.namedNode('http://example.org/graph')
    const quad1 = rdf.quad(subject, predicate, object1, graph)
    const quad2 = rdf.quad(subject, predicate, object2, graph)
    const dataset = rdf.dataset([quad1, quad2])

    expect(dataset.match(null, null, rdf.namedNode('http://example.org/object1'), null).size).toBe(1)
    expect(dataset.match(null, null, rdf.namedNode('http://example.org/object2'), null).size).toBe(1)
    expect(dataset.match(null, null, rdf.namedNode('http://example.org/object3'), null).size).toBe(0)
  })

  test('.match should return a new dataset that contains all quads that pass the graph match pattern', () => {
    const subject = rdf.namedNode('http://example.org/subject')
    const predicate = rdf.namedNode('http://example.org/predicate')
    const object = rdf.namedNode('http://example.org/object')
    const graph1 = rdf.namedNode('http://example.org/graph1')
    const graph2 = rdf.namedNode('http://example.org/graph2')
    const quad1 = rdf.quad(subject, predicate, object, graph1)
    const quad2 = rdf.quad(subject, predicate, object, graph2)
    const dataset = rdf.dataset([quad1, quad2])

    expect(dataset.match(null, null, null, rdf.namedNode('http://example.org/graph1')).size).toBe(1)
    expect(dataset.match(null, null, null, rdf.namedNode('http://example.org/graph2')).size).toBe(1)
    expect(dataset.match(null, null, null, rdf.namedNode('http://example.org/graph3')).size).toBe(0)
  })

  test('.union should return a new graph that contains all triples from the graph object and the given graph', () => {
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
      rdf.literal('b'))

    const quad4 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('c'))

    const dataset1 = rdf.dataset([quad1, quad2])
    const dataset2 = rdf.dataset([quad3, quad4])
    const union = dataset1.union(dataset2)

    expect(dataset1.size).toBe(2)
    expect(dataset2.size).toBe(2)
    expect(union.size).toBe(3)
  })

  test('.contains should work', () => {
    const quad1 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('a'))

    const quad2 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('b'))

    const quad2b = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('b'))

    const quad3 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('c', 'en'))

    const quad4 = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('d', 'en'))

    const dataset1 = rdf.dataset([quad1, quad2])
    const dataset2 = rdf.dataset([quad2b, quad3])
    const dataset3 = rdf.dataset([quad2b, quad3, quad4])
    const union = dataset1.union(dataset2)

    expect(union.size).toBe(3)
    expect(union.contains(dataset1)).toBe(true)
    expect(union.contains(dataset2)).toBe(true)
    expect(dataset1.contains(dataset3)).toBe(false)
  })

  test('.delete should delete the given triple', () => {
    const quad = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('object')
    )
    const dataset = rdf.dataset([quad])

    dataset.delete(quad)

    expect(dataset.size).toBe(0)
  })

  test('.deleteMatches should remove all quads that pass the subject match pattern and return the dataset itself', () => {
    const subject1 = rdf.namedNode('http://example.org/subject1')
    const subject2 = rdf.namedNode('http://example.org/subject2')
    const predicate = rdf.namedNode('http://example.org/predicate')
    const object = rdf.namedNode('http://example.org/object')
    const graph = rdf.namedNode('http://example.org/graph')
    const quad1 = rdf.quad(subject1, predicate, object, graph)
    const quad2 = rdf.quad(subject2, predicate, object, graph)
    const dataset = rdf.dataset([quad1, quad2])

    expect(dataset.deleteMatches(rdf.namedNode('http://example.org/subject3'), null, null, null).size).toBe(2)
    expect(dataset.deleteMatches(rdf.namedNode('http://example.org/subject2'), null, null, null).size).toBe(1)
    expect(dataset.deleteMatches(rdf.namedNode('http://example.org/subject1'), null, null, null).size).toBe(0)
  })

  test('.deleteMatches should remove all quads that pass the predicate match pattern and return the dataset itself', () => {
    const subject = rdf.namedNode('http://example.org/subject')
    const predicate1 = rdf.namedNode('http://example.org/predicate1')
    const predicate2 = rdf.namedNode('http://example.org/predicate2')
    const object = rdf.namedNode('http://example.org/object')
    const graph = rdf.namedNode('http://example.org/graph')
    const quad1 = rdf.quad(subject, predicate1, object, graph)
    const quad2 = rdf.quad(subject, predicate2, object, graph)
    const dataset = rdf.dataset([quad1, quad2])

    expect(dataset.deleteMatches(null, rdf.namedNode('http://example.org/predicate3'), null, null).size).toBe(2)
    expect(dataset.deleteMatches(null, rdf.namedNode('http://example.org/predicate2'), null, null).size).toBe(1)
    expect(dataset.deleteMatches(null, rdf.namedNode('http://example.org/predicate1'), null, null).size).toBe(0)
  })

  test('.deleteMatches should remove all quads that pass the object match pattern and return the dataset itself', () => {
    const subject = rdf.namedNode('http://example.org/subject')
    const predicate = rdf.namedNode('http://example.org/predicate')
    const object1 = rdf.namedNode('http://example.org/object1')
    const object2 = rdf.namedNode('http://example.org/object2')
    const graph = rdf.namedNode('http://example.org/graph')
    const quad1 = rdf.quad(subject, predicate, object1, graph)
    const quad2 = rdf.quad(subject, predicate, object2, graph)
    const dataset = rdf.dataset([quad1, quad2])

    expect(dataset.deleteMatches(null, null, rdf.namedNode('http://example.org/object3'), null).size).toBe(2)
    expect(dataset.deleteMatches(null, null, rdf.namedNode('http://example.org/object2'), null).size).toBe(1)
    expect(dataset.deleteMatches(null, null, rdf.namedNode('http://example.org/object1'), null).size).toBe(0)
  })

  test('.deleteMatches should remove all quads that pass the graph match pattern and return the dataset itself', () => {
    const subject = rdf.namedNode('http://example.org/subject')
    const predicate = rdf.namedNode('http://example.org/predicate')
    const object = rdf.namedNode('http://example.org/object')
    const graph1 = rdf.namedNode('http://example.org/graph1')
    const graph2 = rdf.namedNode('http://example.org/graph2')
    const quad1 = rdf.quad(subject, predicate, object, graph1)
    const quad2 = rdf.quad(subject, predicate, object, graph2)
    const dataset = rdf.dataset([quad1, quad2])

    expect(dataset.deleteMatches(null, null, null, rdf.namedNode('http://example.org/graph3')).size).toBe(2)
    expect(dataset.deleteMatches(null, null, null, rdf.namedNode('http://example.org/graph2')).size).toBe(1)
    expect(dataset.deleteMatches(null, null, null, rdf.namedNode('http://example.org/graph1')).size).toBe(0)
  })

  test('.reduce', () => {
    const quads = [rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.blankNode()
    ), rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.blankNode()
    ), rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.blankNode()
    ), rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.namedNode('http://example.org/foo')
    )]

    const dataset = rdf.dataset(quads)
    const seen = []
    let rand = Math.random()
    dataset.reduce((acc, quad) => {
      expect(acc).toBe(rand)
      expect(quads).toContain(quad)
      expect(seen).not.toContain(quad)
      seen.push(quad)
      rand = Math.random()
      return rand
    }, rand)
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

    const dataset = rdf.dataset([quad1, quad2])

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

    const dataset = rdf.dataset([quad1, quad2])
    const array = dataset.toArray()

    expect(quad1.equals(array[0]))
    expect(quad2.equals(array[1]))
  })

  test('.toCanonical should return a canonicalized version as string', () => {
    const quads = [rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.blankNode()
    ), rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.blankNode()
    ), rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.blankNode()
    ), rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.namedNode('http://example.org/foo')
    )]

    const dataset = rdf.dataset(quads)

    const str = dataset.toCanonical()
    expect(str.trim()).toBe(dedent`
      <http://example.org/subject> <http://example.org/predicate> <http://example.org/foo> .
      <http://example.org/subject> <http://example.org/predicate> _:c14n0 .
      <http://example.org/subject> <http://example.org/predicate> _:c14n1 .
      <http://example.org/subject> <http://example.org/predicate> _:c14n2 .
    `.trim())
  })

  test('.toString should return a string', () => {
    const quads = [rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.blankNode()
    ), rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.blankNode()
    ), rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.blankNode()
    ), rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.namedNode('http://example.org/foo')
    )]

    const dataset = rdf.dataset(quads)

    const str = dataset.toString()
    expect(str.trim()).toBe(dedent`
      <http://example.org/subject> <http://example.org/predicate> <http://example.org/foo> .
      <http://example.org/subject> <http://example.org/predicate> _:c14n0 .
      <http://example.org/subject> <http://example.org/predicate> _:c14n1 .
      <http://example.org/subject> <http://example.org/predicate> _:c14n2 .
    `.trim())
  })

  test('.toStream should return a stream which emits all quads of the dataset', () => {
    const quads = [rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.blankNode()
    )]

    const dataset = rdf.dataset(quads)

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
