const Readable = require('stream').Readable

const N3Store = require('../lib/N3Store')
const utils = require('../lib/utils')
const fromId = utils.fromId

const rdf = require('@rdfjs/data-model')

describe('N3Store', () => {
  describe('The N3Store module', () => {
    test('should be a function', () => {
      expect(typeof N3Store).toBe('function')
    })

    test('should make N3Store objects', () => {
      expect(N3Store()).toBeInstanceOf(N3Store)
    })

    test('should be an N3Store constructor', () => {
      expect(new N3Store()).toBeInstanceOf(N3Store)
    })
  })

  describe('An empty N3Store', () => {
    const store = new N3Store({})

    test('should have size 0', () => {
      expect(store.size).toEqual(0)
    })

    test('should be empty', () => {
      expect(store._getQuads()).toHaveLength(0)
    })

    describe('when importing a stream of 2 quads', () => {
      beforeAll(function (done) {
        const stream = new ArrayReader([
          rdf.quad(rdf.namedNode('s1'), rdf.namedNode('p2'), rdf.namedNode('o2')),
          rdf.quad(rdf.namedNode('s1'), rdf.namedNode('p1'), rdf.namedNode('o1'))
        ])
        const events = store._import(stream)
        events.on('end', done)
      })

      test('should have size 2', () => { expect(store.size).toEqual(2) })
    })

    describe('when removing a stream of 2 quads', () => {
      beforeAll(function (done) {
        const stream = new ArrayReader([
          rdf.quad(rdf.namedNode('s1'), rdf.namedNode('p2'), rdf.namedNode('o2')),
          rdf.quad(rdf.namedNode('s1'), rdf.namedNode('p1'), rdf.namedNode('o1'))
        ])
        const events = store._remove(stream)
        events.on('end', done)
      })

      test('should have size 0', () => { expect(store.size).toEqual(0) })
    })

    describe('every', () => {
      describe('with no parameters and a callback always returning true', () => {
        test('should return false', () => {
          expect(store._every(alwaysTrue, null, null, null, null)).toBe(false)
        })
      })
      describe('with no parameters and a callback always returning false', () => {
        test('should return false', () => {
          expect(store._every(alwaysFalse, null, null, null, null)).toBe(false)
        })
      })
    })

    describe('some', () => {
      describe('with no parameters and a callback always returning true', () => {
        test('should return false', () => {
          expect(store._some(alwaysTrue, null, null, null, null)).toBe(false)
        })
      })
      describe('with no parameters and a callback always returning false', () => {
        test('should return false', () => {
          expect(store._some(alwaysFalse, null, null, null, null)).toBe(false)
        })
      })
    })

    test('should still have size 0 (instead of null) after adding and removing a triple', () => {
      expect(store.size).toEqual(0)
      expect(store._addQuad(quadify('a', 'b', 'c'))).toBe(true)
      expect(store._removeQuad('a', 'b', 'c')).toBe(true)
      expect(store.size).toEqual(0)
    })

    test('should be able to generate unnamed blank nodes', () => {
      expect(store._createBlankNode().value).toEqual('b0')
      expect(store._createBlankNode().value).toEqual('b1')

      expect(store._addQuad(quadify('_:b0', '_:b1', '_:b2'))).toBe(true)
      expect(store._createBlankNode().value).toEqual('b3')
      store._removeQuads(store._getQuads())
    })

    test('should be able to generate named blank nodes', () => {
      expect(store._createBlankNode('blank').value).toEqual('blank')
      expect(store._createBlankNode('blank').value).toEqual('blank1')
      expect(store._createBlankNode('blank').value).toEqual('blank2')
    })

    test('should be able to store triples with generated blank nodes', () => {
      expect(
        store._addQuad(quadify({
          subject: store._createBlankNode('x'),
          predicate: rdf.namedNode('b'),
          object: rdf.namedNode('c')
        }))
      ).toBe(true)
      shouldIncludeAll(store._getQuads(null, rdf.namedNode('b')), ['_:x', 'b', 'c'])()
      store._removeQuads(store._getQuads())
    })
  })

  describe('An N3Store with initialized with 3 elements', () => {
    const store = new N3Store([
      rdf.quad(rdf.namedNode('s1'), rdf.namedNode('p1'), rdf.namedNode('o1')),
      rdf.quad(rdf.namedNode('s1'), rdf.namedNode('p1'), rdf.namedNode('o2')),
      rdf.quad(rdf.namedNode('s1'), rdf.namedNode('p1'), rdf.namedNode('o3'))
    ])

    test('should have size 3', () => {
      expect(store.size).toEqual(3)
    })

    describe('adding a triple that already exists', () => {
      test('should return false', () => {
        expect(store._addQuad(quadify('s1', 'p1', 'o1'))).toBe(false)
      })

      test('should not increase the size', () => {
        expect(store.size).toEqual(3)
      })
    })

    describe('adding a triple that did not exist yet', () => {
      test('should return true', () => {
        expect(store._addQuad(quadify('s1', 'p1', 'o4'))).toBe(true)
      })

      test('should increase the size', () => {
        expect(store.size).toEqual(4)
      })
    })

    describe('removing an existing triple', () => {
      test('should return true', () => {
        expect(store._removeQuad('s1', 'p1', 'o4')).toBe(true)
      })

      test('should decrease the size', () => {
        expect(store.size).toEqual(3)
      })
    })

    describe('removing a non-existing triple', () => {
      test('should return false', () => {
        expect(store._removeQuad('s1', 'p1', 'o5')).toBe(false)
      })

      test('should not decrease the size', () => {
        expect(store.size).toEqual(3)
      })
    })
  })

  describe('An N3Store with 5 elements', () => {
    const store = new N3Store()
    expect(store._addQuad(quadify('s1', 'p1', 'o1'))).toBe(true)
    expect(store._addQuad(quadify({ subject: 's1', predicate: 'p1', object: 'o2' }))).toBe(true)
    store._addQuads(quadify([
      { subject: 's1', predicate: 'p2', object: 'o2' },
      { subject: 's2', predicate: 'p1', object: 'o1' }
    ]))
    expect(store._addQuad(quadify('s1', 'p1', 'o1', 'c4'))).toBe(true)

    test('should have size 5', () => {
      expect(store.size).toEqual(5)
    })

    describe('when searched without parameters', () => {
      test('should return all items', shouldIncludeAll(
        store._getQuads(),
        ['s1', 'p1', 'o1'],
        ['s1', 'p1', 'o2'],
        ['s1', 'p2', 'o2'],
        ['s2', 'p1', 'o1'],
        ['s1', 'p1', 'o1', 'c4']
      ))
    })

    describe('when searched with an existing subject parameter', () => {
      test('should return all items with this subject in all graphs',
        shouldIncludeAll(store._getQuads(rdf.namedNode('s1'), null, null),
          ['s1', 'p1', 'o1'],
          ['s1', 'p1', 'o2'],
          ['s1', 'p2', 'o2'],
          ['s1', 'p1', 'o1', 'c4']
        )
      )
    })

    describe('when searched with a non-existing subject parameter', () => {
      itShouldBeEmpty(store._getQuads(rdf.namedNode('s3'), null, null))
    })

    describe('when searched with a non-existing subject parameter that exists elsewhere', () => {
      itShouldBeEmpty(store._getQuads(rdf.namedNode('p1'), null, null))
    })

    describe('when searched with an existing predicate parameter', () => {
      test('should return all items with this predicate in all graphs',
        shouldIncludeAll(store._getQuads(null, rdf.namedNode('p1'), null),
          ['s1', 'p1', 'o1'],
          ['s1', 'p1', 'o2'],
          ['s2', 'p1', 'o1'],
          ['s1', 'p1', 'o1', 'c4']
        )
      )
    })

    describe('when searched with a non-existing predicate parameter', () => {
      itShouldBeEmpty(store._getQuads(null, rdf.namedNode('p3'), null))
    })

    describe('when searched with an existing object parameter', () => {
      test('should return all items with this object in all graphs',
        shouldIncludeAll(store._getQuads(null, null, rdf.namedNode('o1')),
          ['s1', 'p1', 'o1'],
          ['s2', 'p1', 'o1'],
          ['s1', 'p1', 'o1', 'c4']
        )
      )
    })

    describe('when searched with a non-existing object parameter', () => {
      itShouldBeEmpty(store._getQuads(null, null, rdf.namedNode('o4')))
    })

    describe('when searched with existing subject and predicate parameters', () => {
      test('should return all items with this subject and predicate in all graphs',
        shouldIncludeAll(store._getQuads(rdf.namedNode('s1'), rdf.namedNode('p1'), null),
          ['s1', 'p1', 'o1'],
          ['s1', 'p1', 'o2'],
          ['s1', 'p1', 'o1', 'c4']
        )
      )
    })

    describe('when searched with non-existing subject and predicate parameters', () => {
      itShouldBeEmpty(store._getQuads(rdf.namedNode('s2'), rdf.namedNode('p2'), null))
    })

    describe('when searched with existing subject and object parameters', () => {
      test('should return all items with this subject and object in all graphs',
        shouldIncludeAll(store._getQuads(rdf.namedNode('s1'), null, rdf.namedNode('o1')),
          ['s1', 'p1', 'o1'],
          ['s1', 'p1', 'o1', 'c4']
        )
      )
    })

    describe('when searched with non-existing subject and object parameters', () => {
      itShouldBeEmpty(store._getQuads(rdf.namedNode('s2'), rdf.namedNode('p2'), null))
    })

    describe('when searched with existing predicate and object parameters', () => {
      test('should return all items with this predicate and object in all graphs',
        shouldIncludeAll(store._getQuads(null, rdf.namedNode('p1'), rdf.namedNode('o1')),
          ['s1', 'p1', 'o1'],
          ['s2', 'p1', 'o1'],
          ['s1', 'p1', 'o1', 'c4']
        )
      )
    })

    describe('when searched with non-existing predicate and object parameters in the default graph', () => {
      itShouldBeEmpty(store._getQuads(null, rdf.namedNode('p2'), rdf.namedNode('o3'), rdf.defaultGraph()))
    })

    describe('when searched with existing subject, predicate, and object parameters', () => {
      test('should return all items with this subject, predicate, and object in all graphs',
        shouldIncludeAll(store._getQuads(rdf.namedNode('s1'), rdf.namedNode('p1'), rdf.namedNode('o1')),
          ['s1', 'p1', 'o1'],
          ['s1', 'p1', 'o1', 'c4']
        )
      )
    })

    describe('when searched with a non-existing triple', () => {
      itShouldBeEmpty(store._getQuads(rdf.namedNode('s2'), rdf.namedNode('p2'), rdf.namedNode('o1')))
    })

    describe('when searched with the default graph parameter', () => {
      test('should return all items in the default graph',
        shouldIncludeAll(store._getQuads(null, null, null, rdf.defaultGraph()),
          ['s1', 'p1', 'o1'],
          ['s1', 'p1', 'o2'],
          ['s1', 'p2', 'o2'],
          ['s2', 'p1', 'o1']
        )
      )
    })

    describe('when searched with an existing named graph parameter', () => {
      test('should return all items in that graph',
        shouldIncludeAll(store._getQuads(null, null, null, rdf.namedNode('c4')),
          ['s1', 'p1', 'o1', 'c4']
        )
      )
    })

    describe('when searched with a non-existing named graph parameter', () => {
      itShouldBeEmpty(store._getQuads(null, null, null, rdf.namedNode('c5')))
    })

    describe('getSubjects', () => {
      describe('with existing predicate, object and graph parameters', () => {
        test('should return all subjects with this predicate, object and graph', () => {
          expect(
            store._getSubjects(rdf.namedNode('p1'), rdf.namedNode('o1'), rdf.namedNode('c4'))
          ).toEqual(expect.arrayContaining([rdf.namedNode('s1')]))
        })
      })

      describe('with existing predicate and object parameters', () => {
        test('should return all subjects with this predicate and object', () => {
          expect(store._getSubjects(rdf.namedNode('p2'), rdf.namedNode('o2'), null))
            .toEqual(expect.arrayContaining([rdf.namedNode('s1')]))
        })
      })

      describe('with existing predicate and graph parameters', () => {
        test('should return all subjects with this predicate and graph', () => {
          expect(store._getSubjects(rdf.namedNode('p1'), null, rdf.defaultGraph()))
            .toEqual(expect.arrayContaining([rdf.namedNode('s1'), rdf.namedNode('s2')]))
        })
      })

      describe('with existing object and graph parameters', () => {
        test('should return all subjects with this object and graph', () => {
          expect(store._getSubjects(null, rdf.namedNode('o1'), rdf.defaultGraph()))
            .toEqual(expect.arrayContaining([rdf.namedNode('s1'), rdf.namedNode('s2')]))
        })
      })

      describe('with an existing predicate parameter', () => {
        test('should return all subjects with this predicate', () => {
          expect(store._getSubjects(rdf.namedNode('p1'), null, null))
            .toEqual(expect.arrayContaining([rdf.namedNode('s1'), rdf.namedNode('s2')]))
        })
      })

      describe('with an existing object parameter', () => {
        test('should return all subjects with this object', () => {
          expect(store._getSubjects(null, rdf.namedNode('o1'), null))
            .toEqual(expect.arrayContaining([rdf.namedNode('s1'), rdf.namedNode('s2')]))
        })
      })

      describe('with an existing graph parameter', () => {
        test('should return all subjects in the graph', () => {
          expect(store._getSubjects(null, null, rdf.namedNode('c4')))
            .toEqual(expect.arrayContaining([rdf.namedNode('s1')]))
        })
      })

      describe('with no parameters', () => {
        test('should return all subjects', () => {
          expect(store._getSubjects(null, null, null))
            .toEqual(expect.arrayContaining([rdf.namedNode('s1'), rdf.namedNode('s2')]))
        })
      })
    })

    describe('getPredicates', () => {
      describe('with existing subject, object and graph parameters', () => {
        test('should return all predicates with this subject, object and graph', () => {
          expect(
            store._getPredicates(rdf.namedNode('s1'), rdf.namedNode('o1'), rdf.namedNode('c4'))
          ).toEqual(expect.arrayContaining([rdf.namedNode('p1')]))
        })
      })

      describe('with existing subject and object parameters', () => {
        test('should return all predicates with this subject and object', () => {
          expect(store._getPredicates(rdf.namedNode('s1'), rdf.namedNode('o2'), null))
            .toEqual(expect.arrayContaining([rdf.namedNode('p1'), rdf.namedNode('p2')]))
        })
      })

      describe('with existing subject and graph parameters', () => {
        test('should return all predicates with this subject and graph', () => {
          expect(store._getPredicates(rdf.namedNode('s1'), null, rdf.defaultGraph()))
            .toEqual(expect.arrayContaining([rdf.namedNode('p1'), rdf.namedNode('p2')]))
        })
      })

      describe('with existing object and graph parameters', () => {
        test('should return all predicates with this object and graph', () => {
          expect(store._getPredicates(null, rdf.namedNode('o1'), rdf.defaultGraph()))
            .toEqual(expect.arrayContaining([rdf.namedNode('p1')]))
        })
      })

      describe('with an existing subject parameter', () => {
        test('should return all predicates with this subject', () => {
          expect(store._getPredicates(rdf.namedNode('s2'), null, null))
            .toEqual(expect.arrayContaining([rdf.namedNode('p1')]))
        })
      })

      describe('with an existing object parameter', () => {
        test('should return all predicates with this object', () => {
          expect(store._getPredicates(null, rdf.namedNode('o1'), null))
            .toEqual(expect.arrayContaining([rdf.namedNode('p1')]))
        })
      })

      describe('with an existing graph parameter', () => {
        test('should return all predicates in the graph', () => {
          expect(store._getPredicates(null, null, rdf.namedNode('c4')))
            .toEqual(expect.arrayContaining([rdf.namedNode('p1')]))
        })
      })

      describe('with no parameters', () => {
        test('should return all predicates', () => {
          expect(store._getPredicates(null, null, null))
            .toEqual(expect.arrayContaining([rdf.namedNode('p1'), rdf.namedNode('p2')]))
        })
      })
    })

    describe('getObjects', () => {
      describe('with existing subject, predicate and graph parameters', () => {
        test('should return all objects with this subject, predicate and graph', () => {
          expect(
            store._getObjects(rdf.namedNode('s1'), rdf.namedNode('p1'), rdf.defaultGraph())
          ).toEqual(expect.arrayContaining([rdf.namedNode('o1'), rdf.namedNode('o2')]))
        })
      })

      describe('with existing subject and predicate parameters', () => {
        test('should return all objects with this subject and predicate', () => {
          expect(store._getObjects(rdf.namedNode('s1'), rdf.namedNode('p1'), null))
            .toEqual(expect.arrayContaining([rdf.namedNode('o1'), rdf.namedNode('o2')]))
        })
      })

      describe('with existing subject and graph parameters', () => {
        test('should return all objects with this subject and graph', () => {
          expect(store._getObjects(rdf.namedNode('s1'), null, rdf.defaultGraph()))
            .toEqual(expect.arrayContaining([rdf.namedNode('o1'), rdf.namedNode('o2')]))
        })
      })

      describe('with existing predicate and graph parameters', () => {
        test('should return all objects with this predicate and graph', () => {
          expect(store._getObjects(null, rdf.namedNode('p1'), rdf.defaultGraph()))
            .toEqual(expect.arrayContaining([rdf.namedNode('o1'), rdf.namedNode('o2')]))
        })
      })

      describe('with an existing subject parameter', () => {
        test('should return all objects with this subject', () => {
          expect(store._getObjects(rdf.namedNode('s1'), null, null))
            .toEqual(expect.arrayContaining([rdf.namedNode('o1'), rdf.namedNode('o2')]))
        })
      })

      describe('with an existing predicate parameter', () => {
        test('should return all objects with this predicate', () => {
          expect(store._getObjects(null, rdf.namedNode('p1'), null))
            .toEqual(expect.arrayContaining([rdf.namedNode('o1'), rdf.namedNode('o2')]))
        })
      })

      describe('with an existing graph parameter', () => {
        test('should return all objects in the graph', () => {
          expect(store._getObjects(null, null, rdf.namedNode('c4')))
            .toEqual(expect.arrayContaining([rdf.namedNode('o1')]))
        })
      })

      describe('with no parameters', () => {
        test('should return all objects', () => {
          expect(store._getObjects(null, null, null))
            .toEqual(expect.arrayContaining([rdf.namedNode('o1'), rdf.namedNode('o2')]))
        })
      })
    })

    describe('getGraphs', () => {
      describe('with existing subject, predicate and object parameters', () => {
        test('should return all graphs with this subject, predicate and object', () => {
          expect(
            store._getGraphs(rdf.namedNode('s1'), rdf.namedNode('p1'), rdf.namedNode('o1'))
          ).toEqual(expect.arrayContaining([rdf.namedNode('c4'), rdf.defaultGraph()]))
        })
      })

      describe('with existing subject and predicate parameters', () => {
        test('should return all graphs with this subject and predicate', () => {
          expect(store._getGraphs(rdf.namedNode('s1'), rdf.namedNode('p1'), null))
            .toEqual(expect.arrayContaining([rdf.namedNode('c4'), rdf.defaultGraph()]))
        })
      })

      describe('with existing subject and object parameters', () => {
        test('should return all graphs with this subject and object', () => {
          expect(store._getGraphs(rdf.namedNode('s1'), null, rdf.namedNode('o2')))
            .toEqual(expect.arrayContaining([rdf.defaultGraph()]))
        })
      })

      describe('with existing predicate and object parameters', () => {
        test('should return all graphs with this predicate and object', () => {
          expect(store._getGraphs(null, rdf.namedNode('p1'), rdf.namedNode('o1')))
            .toEqual(expect.arrayContaining([rdf.defaultGraph(), rdf.namedNode('c4')]))
        })
      })

      describe('with an existing subject parameter', () => {
        test('should return all graphs with this subject', () => {
          expect(store._getGraphs(rdf.namedNode('s1'), null, null))
            .toEqual(expect.arrayContaining([rdf.namedNode('c4'), rdf.defaultGraph()]))
        })
      })

      describe('with an existing predicate parameter', () => {
        test('should return all graphs with this predicate', () => {
          expect(store._getGraphs(null, rdf.namedNode('p1'), null))
            .toEqual(expect.arrayContaining([rdf.namedNode('c4'), rdf.defaultGraph()]))
        })
      })

      describe('with an existing object parameter', () => {
        test('should return all graphs with this object', () => {
          expect(store._getGraphs(null, null, rdf.namedNode('o2')))
            .toEqual(expect.arrayContaining([rdf.defaultGraph()]))
        })
      })

      describe('with no parameters', () => {
        test('should return all graphs', () => {
          expect(store._getGraphs(null, null, null))
            .toEqual(expect.arrayContaining([rdf.namedNode('c4'), rdf.defaultGraph()]))
        })
      })
    })

    describe('forEach', () => {
      describe('with existing subject, predicate, object and graph parameters', () => {
        test('should have iterated all items with this subject, predicate, object and graph',
          shouldIncludeAll(
            collect(store, '_forEach', 's1', 'p1', 'o2', ''),
            ['s1', 'p1', 'o2', ''])
        )
      })

      describe('with existing subject, predicate and object parameters', () => {
        test('should have iterated all items with this subject, predicate and object',
          shouldIncludeAll(
            collect(store, '_forEach', 's1', 'p2', 'o2', null),
            ['s1', 'p2', 'o2', ''])
        )
      })

      describe('with existing subject, predicate and graph parameters', () => {
        test('should have iterated all items with this subject, predicate and graph',
          shouldIncludeAll(
            collect(store, '_forEach', 's1', 'p1', null, ''),
            ['s1', 'p1', 'o1', ''],
            ['s1', 'p1', 'o2', ''])
        )
      })

      describe('with existing subject, object and graph parameters', () => {
        test('should have iterated all items with this subject, object and graph',
          shouldIncludeAll(
            collect(store, '_forEach', 's1', null, 'o2', ''),
            ['s1', 'p1', 'o2', ''],
            ['s1', 'p2', 'o2', ''])
        )
      })

      describe('with existing predicate, object and graph parameters', () => {
        test('should have iterated all items with this predicate, object and graph',
          shouldIncludeAll(
            collect(store, '_forEach', null, 'p1', 'o1', ''),
            ['s1', 'p1', 'o1', ''],
            ['s2', 'p1', 'o1', ''])
        )
      })

      describe('with existing subject and predicate parameters', () => {
        test('should iterate all items with this subject and predicate',
          shouldIncludeAll(
            collect(store, '_forEach', 's1', 'p1', null, null),
            ['s1', 'p1', 'o1', ''],
            ['s1', 'p1', 'o2', ''],
            ['s1', 'p1', 'o1', 'c4'])
        )
      })

      describe('with existing subject and object parameters', () => {
        test('should iterate all items with this subject and predicate',
          shouldIncludeAll(
            collect(store, '_forEach', 's1', null, 'o2', null),
            ['s1', 'p1', 'o2', ''],
            ['s1', 'p2', 'o2', ''])
        )
      })

      describe('with existing subject and graph parameters', () => {
        test('should iterate all items with this subject and graph',
          shouldIncludeAll(
            collect(store, '_forEach', 's1', null, null, 'c4'),
            ['s1', 'p1', 'o1', 'c4'])
        )
      })

      describe('with existing predicate and object parameters', () => {
        test('should iterate all items with this predicate and object',
          shouldIncludeAll(
            collect(store, '_forEach', null, 'p1', 'o1', null),
            ['s1', 'p1', 'o1', ''],
            ['s2', 'p1', 'o1', ''],
            ['s1', 'p1', 'o1', 'c4'])
        )
      })

      describe('with existing predicate and graph parameters', () => {
        test('should iterate all items with this predicate and graph',
          shouldIncludeAll(
            collect(store, '_forEach', null, 'p1', null, ''),
            ['s1', 'p1', 'o1', ''],
            ['s1', 'p1', 'o2', ''],
            ['s2', 'p1', 'o1', ''])
        )
      })

      describe('with existing object and graph parameters', () => {
        test('should iterate all items with this object and graph',
          shouldIncludeAll(
            collect(store, '_forEach', null, null, 'o1', ''),
            ['s1', 'p1', 'o1', ''],
            ['s2', 'p1', 'o1', ''])
        )
      })

      describe('with an existing subject parameter', () => {
        test('should iterate all items with this subject',
          shouldIncludeAll(
            collect(store, '_forEach', 's2', null, null, null),
            ['s2', 'p1', 'o1', ''])
        )
      })

      describe('with an existing predicate parameter', () => {
        test('should iterate all items with this predicate',
          shouldIncludeAll(
            collect(store, '_forEach', null, 'p1', null, null),
            ['s1', 'p1', 'o1', ''],
            ['s1', 'p1', 'o2', ''],
            ['s2', 'p1', 'o1', ''],
            ['s1', 'p1', 'o1', 'c4'])
        )
      })

      describe('with an existing object parameter', () => {
        test('should iterate all items with this object',
          shouldIncludeAll(
            collect(store, '_forEach', null, null, 'o1', null),
            ['s1', 'p1', 'o1', ''],
            ['s2', 'p1', 'o1', ''],
            ['s1', 'p1', 'o1', 'c4'])
        )
      })

      describe('with an existing graph parameter', () => {
        test('should iterate all items with this graph',
          shouldIncludeAll(
            collect(store, '_forEach', null, null, null, ''),
            ['s1', 'p1', 'o1'],
            ['s1', 'p1', 'o2'],
            ['s1', 'p2', 'o2'],
            ['s2', 'p1', 'o1'])
        )
      })

      describe('with no parameters', () => {
        test('should iterate all items',
          shouldIncludeAll(
            collect(store, '_forEach', null, null, null, null),
            ['s1', 'p1', 'o1'],
            ['s1', 'p1', 'o2'],
            ['s1', 'p2', 'o2'],
            ['s2', 'p1', 'o1'],
            ['s1', 'p1', 'o1', 'c4'])
        )
      })
    })

    describe('forSubjects', () => {
      describe('with existing predicate, object and graph parameters', () => {
        test('should iterate all subjects with this predicate, object and graph', () => {
          expect(collect(store, '_forSubjects', 'p1', 'o1', ''))
            .toEqual(expect.arrayContaining([rdf.namedNode('s1'), rdf.namedNode('s2')]))
        })
      })
      describe('with a non-existing predicate', () => {
        test('should be empty', () => {
          expect(collect(store, '_forSubjects', 'p3', null, null)).toHaveLength(0)
        })
      })
      describe('with a non-existing object', () => {
        test('should be empty', () => {
          expect(collect(store, '_forSubjects', null, 'o4', null)).toHaveLength(0)
        })
      })
      describe('with a non-existing graph', () => {
        test('should be empty', () => {
          expect(collect(store, '_forSubjects', null, null, 'g2')).toHaveLength(0)
        })
      })
    })

    describe('forPredicates', () => {
      describe('with existing subject, object and graph parameters', () => {
        test('should iterate all predicates with this subject, object and graph', () => {
          expect(collect(store, '_forPredicates', 's1', 'o2', ''))
            .toEqual(expect.arrayContaining([rdf.namedNode('p1'), rdf.namedNode('p2')]))
        })
      })
      describe('with a non-existing subject', () => {
        test('should be empty', () => {
          expect(collect(store, '_forPredicates', 's3', null, null)).toHaveLength(0)
        })
      })
      describe('with a non-existing object', () => {
        test('should be empty', () => {
          expect(collect(store, '_forPredicates', null, 'o4', null)).toHaveLength(0)
        })
      })
      describe('with a non-existing graph', () => {
        test('should be empty', () => {
          expect(collect(store, '_forPredicates', null, null, 'g2')).toHaveLength(0)
        })
      })
    })

    describe('forObjects', () => {
      describe('with existing subject, predicate and graph parameters', () => {
        test('should iterate all objects with this subject, predicate and graph', () => {
          expect(collect(store, '_forObjects', 's1', 'p1', ''))
            .toEqual(expect.arrayContaining([rdf.namedNode('o1'), rdf.namedNode('o2')]))
        })
      })
      describe('with a non-existing subject', () => {
        test('should be empty', () => {
          expect(collect(store, '_forObjects', 's3', null, null)).toHaveLength(0)
        })
      })
      describe('with a non-existing predicate', () => {
        test('should be empty', () => {
          expect(collect(store, '_forObjects', null, 'p3', null)).toHaveLength(0)
        })
      })
      describe('with a non-existing graph', () => {
        test('should be empty', () => {
          expect(collect(store, '_forObjects', null, null, 'g2')).toHaveLength(0)
        })
      })
    })

    describe('forGraphs', () => {
      describe('with existing subject, predicate and object parameters', () => {
        test('should iterate all graphs with this subject, predicate and object', () => {
          expect(collect(store, '_forGraphs', 's1', 'p1', 'o1'))
            .toEqual(expect.arrayContaining([rdf.defaultGraph(), rdf.namedNode('c4')]))
        })
      })
      describe('with a non-existing subject', () => {
        test('should be empty', () => {
          expect(collect(store, '_forObjects', 's3', null, null)).toHaveLength(0)
        })
      })
      describe('with a non-existing predicate', () => {
        test('should be empty', () => {
          expect(collect(store, '_forObjects', null, 'p3', null)).toHaveLength(0)
        })
      })
      describe('with a non-existing graph', () => {
        test('should be empty', () => {
          expect(collect(store, '_forPredicates', null, null, 'g2')).toHaveLength(0)
        })
      })
    })

    describe('every', () => {
      let count = 3
      function thirdTimeFalse () { return count-- === 0 }

      describe('with no parameters and a callback always returning true', () => {
        test('should return true', () => {
          expect(store._every(alwaysTrue, null, null, null, null)).toBe(true)
        })
      })
      describe('with no parameters and a callback always returning false', () => {
        test('should return false', () => {
          expect(store._every(alwaysFalse, null, null, null, null)).toBe(false)
        })
      })
      describe('with no parameters and a callback that returns false after 3 calls', () => {
        test('should return false', () => {
          expect(store._every(thirdTimeFalse, null, null, null, null)).toBe(false)
        })
      })
    })

    describe('some', () => {
      let count = 3
      function thirdTimeFalse () { return count-- !== 0 }

      describe('with no parameters and a callback always returning true', () => {
        test('should return true', () => {
          expect(store._some(alwaysTrue, null, null, null, null)).toBe(true)
        })
      })
      describe('with no parameters and a callback always returning false', () => {
        test('should return false', () => {
          expect(store._some(alwaysFalse, null, null, null, null)).toBe(false)
        })
      })
      describe('with no parameters and a callback that returns true after 3 calls', () => {
        test('should return false', () => {
          expect(store._some(thirdTimeFalse, null, null, null, null)).toBe(true)
        })
      })
      describe('with a non-existing subject', () => {
        test('should return true', () => {
          expect(store._some(null, rdf.namedNode('s3'), null, null, null)).toBe(false)
        })
      })
      describe('with a non-existing predicate', () => {
        test('should return false', () => {
          expect(store._some(null, null, rdf.namedNode('p3'), null, null)).toBe(false)
        })
      })
      describe('with a non-existing object', () => {
        test('should return false', () => {
          expect(store._some(null, null, null, rdf.namedNode('o4'), null)).toBe(false)
        })
      })
      describe('with a non-existing graph', () => {
        test('should return false', () => {
          expect(store._some(null, null, null, null, rdf.namedNode('g2'))).toBe(false)
        })
      })
    })

    describe('when counted without parameters', () => {
      test('should count all items in all graphs', () => {
        expect(store._countQuads()).toBe(5)
      })
    })

    describe('when counted with an existing subject parameter', () => {
      test('should count all items with this subject in all graphs', () => {
        expect(store._countQuads(rdf.namedNode('s1'), null, null)).toBe(4)
      })
    })

    describe('when counted with a non-existing subject parameter', () => {
      test('should be empty', () => {
        expect(store._countQuads(rdf.namedNode('s3'), null, null)).toBe(0)
      })
    })

    describe('when counted with a non-existing subject parameter that exists elsewhere', () => {
      test('should be empty', () => {
        expect(store._countQuads(rdf.namedNode('p1'), null, null)).toBe(0)
      })
    })

    describe('when counted with an existing predicate parameter', () => {
      test('should count all items with this predicate in all graphs', () => {
        expect(store._countQuads(null, rdf.namedNode('p1'), null)).toBe(4)
      })
    })

    describe('when counted with a non-existing predicate parameter', () => {
      test('should be empty', () => {
        expect(store._countQuads(null, rdf.namedNode('p3'), null)).toBe(0)
      })
    })

    describe('when counted with an existing object parameter', () => {
      test('should count all items with this object in all graphs', () => {
        expect(store._countQuads(null, null, 'o1')).toBe(3)
      })
    })

    describe('when counted with a non-existing object parameter', () => {
      test('should be empty', () => {
        expect(store._countQuads(null, null, 'o4')).toBe(0)
      })
    })

    describe('when counted with existing subject and predicate parameters', () => {
      test('should count all items with this subject and predicate in all graphs', () => {
        expect(store._countQuads('s1', 'p1', null)).toBe(3)
      })
    })

    describe('when counted with non-existing subject and predicate parameters', () => {
      test('should be empty', () => {
        expect(store._countQuads('s2', 'p2', null)).toBe(0)
      })
    })

    describe('when counted with existing subject and object parameters', () => {
      test('should count all items with this subject and object in all graphs', () => {
        expect(store._countQuads('s1', null, 'o1')).toBe(2)
      })
    })

    describe('when counted with non-existing subject and object parameters', () => {
      test('should be empty', () => {
        expect(store._countQuads('s2', 'p2', null)).toBe(0)
      })
    })

    describe('when counted with existing predicate and object parameters', () => {
      test('should count all items with this predicate and object in all graphs', () => {
        expect(store._countQuads(null, 'p1', 'o1')).toBe(3)
      })
    })

    describe('when counted with non-existing predicate and object parameters', () => {
      test('should be empty', () => {
        expect(store._countQuads(null, 'p2', 'o3')).toBe(0)
      })
    })

    describe('when counted with existing subject, predicate, and object parameters', () => {
      test('should count all items with this subject, predicate, and object in all graphs', () => {
        expect(store._countQuads('s1', 'p1', 'o1')).toBe(2)
      })
    })

    describe('when counted with a non-existing triple', () => {
      test('should be empty', () => {
        expect(store._countQuads('s2', 'p2', 'o1')).toBe(0)
      })
    })

    describe('when counted with the default graph parameter', () => {
      test('should count all items in the default graph', () => {
        expect(store._countQuads(null, null, null, rdf.defaultGraph())).toBe(4)
      })
    })

    describe('when counted with an existing named graph parameter', () => {
      test('should count all items in that graph', () => {
        expect(store._countQuads(null, null, null, 'c4')).toBe(1)
      })
    })

    describe('when counted with a non-existing named graph parameter', () => {
      test('should be empty', () => {
        expect(store._countQuads(null, null, null, 'c5')).toBe(0)
      })
    })

    describe('when trying to remove a triple with a non-existing subject', () => {
      beforeAll(function () {
        expect(
          store._removeQuad(rdf.namedNode('s0'), rdf.namedNode('p1'), rdf.namedNode('o1'))
        ).toBe(false)
      })
      test('should still have size 5', () => { expect(store.size).toEqual(5) })
    })

    describe('when trying to remove a triple with a non-existing predicate', () => {
      beforeAll(function () {
        expect(
          store._removeQuad(rdf.namedNode('s1'), rdf.namedNode('p0'), rdf.namedNode('o1'))
        ).toBe(false)
      })
      test('should still have size 5', () => { expect(store.size).toEqual(5) })
    })

    describe('when trying to remove a triple with a non-existing object', () => {
      beforeAll(function () {
        expect(
          store._removeQuad(rdf.namedNode('s1'), rdf.namedNode('p1'), rdf.namedNode('o0'))
        ).toBe(false)
      })
      test('should still have size 5', () => { expect(store.size).toEqual(5) })
    })

    describe('when trying to remove a triple for which no subjects exist', () => {
      beforeAll(function () {
        expect(
          store._removeQuad(rdf.namedNode('o1'), rdf.namedNode('p1'), rdf.namedNode('o1'))
        ).toBe(false)
      })
      test('should still have size 5', () => { expect(store.size).toEqual(5) })
    })

    describe('when trying to remove a triple for which no predicates exist', () => {
      beforeAll(function () {
        expect(
          store._removeQuad(rdf.namedNode('s1'), rdf.namedNode('s1'), rdf.namedNode('o1'))
        ).toBe(false)
      })
      test('should still have size 5', () => { expect(store.size).toEqual(5) })
    })

    describe('when trying to remove a triple for which no objects exist', () => {
      beforeAll(function () {
        expect(
          store._removeQuad(rdf.namedNode('s1'), rdf.namedNode('p1'), rdf.namedNode('s1'))
        ).toBe(false)
      })
      test('should still have size 5', () => { expect(store.size).toEqual(5) })
    })

    describe('when trying to remove a triple that does not exist', () => {
      beforeAll(function () {
        expect(
          store._removeQuad(rdf.namedNode('s1'), rdf.namedNode('p2'), rdf.namedNode('o1'))
        ).toBe(false)
      })
      test('should still have size 5', () => { expect(store.size).toEqual(5) })
    })

    describe('when trying to remove an incomplete triple', () => {
      beforeAll(function () {
        expect(store._removeQuad(rdf.namedNode('s1'), null, null)).toBe(false)
      })
      test('should still have size 5', () => { expect(store.size).toEqual(5) })
    })

    describe('when trying to remove a triple with a non-existing graph', () => {
      beforeAll(function () {
        expect(
          store._removeQuad(rdf.namedNode('s1'), rdf.namedNode('p1'), rdf.namedNode('o1'), rdf.namedNode('c0'))
        ).toBe(false)
      })
      test('should still have size 5', () => { expect(store.size).toEqual(5) })
    })

    describe('when removing an existing triple', () => {
      beforeAll(function () {
        expect(
          store._removeQuad(rdf.namedNode('s1'), rdf.namedNode('p1'), rdf.namedNode('o1'))
        ).toBe(true)
      })

      test('should have size 4', () => { expect(store.size).toEqual(4) })

      test('should not contain that triple anymore',
        shouldIncludeAll(
          () => store._getQuads(),
          ['s1', 'p1', 'o2'],
          ['s1', 'p2', 'o2'],
          ['s2', 'p1', 'o1'],
          ['s1', 'p1', 'o1', 'c4']
        )
      )
    })

    describe('when removing an existing triple from a named graph', () => {
      beforeAll(function () {
        expect(
          store._removeQuad(rdf.namedNode('s1'), rdf.namedNode('p1'), rdf.namedNode('o1'), rdf.namedNode('c4'))
        ).toBe(true)
      })

      test('should have size 3', () => { expect(store.size).toEqual(3) })

      itShouldBeEmpty(function () { return store._getQuads(null, null, null, 'c4') })
    })

    describe('when removing multiple triples', () => {
      beforeAll(function () {
        store._removeQuads([
          rdf.quad(rdf.namedNode('s1'), rdf.namedNode('p2'), rdf.namedNode('o2')),
          rdf.quad(rdf.namedNode('s2'), rdf.namedNode('p1'), rdf.namedNode('o1'))
        ])
      })

      test('should have size 1', () => { expect(store.size).toEqual(1) })

      test('should not contain those triples anymore',
        shouldIncludeAll(
          () => store._getQuads(),
          ['s1', 'p1', 'o2']
        )
      )
    })

    describe('when adding and removing a triple', () => {
      beforeAll(function () {
        expect(store._addQuad(quadify('a', 'b', 'c'))).toBe(true)
        expect(
          store._removeQuad(rdf.namedNode('a'), rdf.namedNode('b'), rdf.namedNode('c'))
        ).toBe(true)
      })

      test('should have an unchanged size', () => { expect(store.size).toEqual(1) })
    })
  })

  describe('An N3Store containing a blank node', () => {
    const store = new N3Store()
    const b1 = store._createBlankNode()
    expect(store._addQuad(quadify('s1', 'p1', b1))).toBe(true)

    describe('when searched with more than one variable', () => {
      test('should return a triple with the blank node as an object',
        shouldIncludeAll(
          store._getQuads(),
          ['s1', 'p1', `_:${b1.value}`]
        )
      )
    })

    describe('when searched with one variable', () => {
      test('should return a triple with the blank node as an object',
        shouldIncludeAll(store._getQuads('s1', 'p1'),
          ['s1', 'p1', `_:${b1.value}`]
        )
      )
    })
  })

  describe('An N3Store with a custom DataFactory', () => {
    let store; const factory = {}
    beforeAll(function () {
      factory.quad = (s, p, o, g) => ({ s, p, o, g })

      ;['namedNode', 'blankNode', 'literal', 'variable', 'defaultGraph'].forEach(function (f) {
        factory[f] = (n) => n ? `${f[0]}-${n}` : f
      })

      store = new N3Store({ factory })
      expect(store._addQuad(quadify('s1', 'p1', 'o1'))).toBe(true)
      expect(store._addQuad(quadify({ subject: 's1', predicate: 'p1', object: 'o2' }))).toBe(true)
      store._addQuads(quadify([
        { subject: 's1', predicate: 'p2', object: 'o2' },
        { subject: 's2', predicate: 'p1', object: 'o1' }
      ]))
      expect(store._addQuad(quadify('s1', 'p1', 'o1', 'c4'))).toBe(true)
    })
  })

  describe('An N3Store', () => {
    const store = new N3Store()

    // Test inspired by http://www.devthought.com/2012/01/18/an-object-is-not-a-hash/.
    // The value `__proto__` is not supported however – fixing it introduces too much overhead.
    test('should be able to contain entities with JavaScript object property names', () => {
      expect(store._addQuad(quadify('toString', 'valueOf', 'toLocaleString', 'hasOwnProperty'))).toBe(true)
      shouldIncludeAll(store._getQuads(null, null, null, 'hasOwnProperty'),
        ['toString', 'valueOf', 'toLocaleString', 'hasOwnProperty'])()
    })

    test('should be able to contain entities named "null"', () => {
      expect(store._addQuad(quadify('null', 'null', 'null', 'null'))).toBe(true)
      shouldIncludeAll(store._getQuads(null, null, null, 'null'), ['null', 'null', 'null', 'null'])()
    })
  })
})

function alwaysTrue () { return true }
function alwaysFalse () { return false }

function collect (store, method, arg1, arg2, arg3, arg4) {
  const results = []
  const cb = (r) => { results.push(r) }
  store[method](cb, arg1 && fromId(arg1), arg2 && fromId(arg2), arg3 && fromId(arg3), arg4 && fromId(arg4))
  return results
}

function itShouldBeEmpty (result) {
  test('should be empty', () => {
    if (typeof result === 'function') {
      result = result()
    }
    expect(Object.keys(result)).toHaveLength(0)
  })
}

function shouldIncludeAll (result, ...expectedQuads) {
  const items = expectedQuads
    .map(([subject, predicate, object, graph = '']) =>
      rdf.quad(fromId(subject), fromId(predicate), fromId(object), fromId(graph))
    )
  return () => {
    if (typeof result === 'function') result = result()
    result = result.map(r => r)
    expect(result).toHaveLength(items.length)
    for (let i = 0; i < items.length; i++) {
      expect(result).toContainEqual(items[i])
    }
  }
}

function ArrayReader (items) {
  const reader = new Readable({ objectMode: true })
  reader._read = function () {
    this.push(items.shift() || null)
  }
  return reader
}

function _quadify (arg) {
  let subject, predicate, object, graph
  if (Array.isArray(arg)) {
    ([subject, predicate, object, graph] = arg)
  } else {
    ({ subject, predicate, object, graph } = arg)
  }
  return rdf.quad(...[subject, predicate, object, graph].map(p => {
    if (typeof p === 'string') {
      return fromId(p)
    }
    return p
  }))
}

function quadify (items, ...rest) {
  if (Array.isArray(items)) {
    return items.map(_quadify)
  }

  if (typeof items === 'string') {
    return _quadify([items, ...rest])
  }

  if (typeof items === 'object') {
    return _quadify(items)
  }
  throw new Error('not sure how to quadify', items)
}
