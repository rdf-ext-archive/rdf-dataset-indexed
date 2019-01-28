#!/usr/bin/env node
const assert = require('assert')
if (!assert.hasOwnProperty('strict')) {
  assert.strict = {
    equal: assert.equal, // eslint-disable-line
    deepEqual: assert.deepEqual // eslint-disable-line
  }
}
const rdf = require('@rdfjs/data-model')

const Dataset = require('../dataset')

console.log('N3Store performance test')

const prefix = 'http://example.org/#'

/* Test triples */
let dim = parseInt(process.argv[2], 10) || 64
let dimSquared = dim * dim
let dimCubed = dimSquared * dim

let dataset = new Dataset()
let TEST = `- Adding ${dimCubed} triples to the default graph`
console.time(TEST)
let i, j, k, l
for (i = 0; i < dim; i++) {
  for (j = 0; j < dim; j++) {
    for (k = 0; k < dim; k++) {
      dataset.add(
        rdf.quad(
          rdf.namedNode(prefix + i),
          rdf.namedNode(prefix + j),
          rdf.namedNode(prefix + k)
        )
      )
    }
  }
}
console.timeEnd(TEST)

console.log(`* Memory usage for triples: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`)

TEST = `- Finding all ${dimCubed} triples in the default graph ${dimSquared * 1} times (0 variables)`
console.time(TEST)
for (i = 0; i < dim; i++) {
  for (j = 0; j < dim; j++) {
    for (k = 0; k < dim; k++) {
      assert.strict.equal(dataset.match(prefix + i, prefix + j, prefix + k, '').length, 1)
    }
  }
}
console.timeEnd(TEST)

TEST = `- Finding all ${dimCubed} triples in the default graph ${dimSquared * 2} times (1 variable)`
console.time(TEST)
for (i = 0; i < dim; i++) {
  for (j = 0; j < dim; j++) {
    assert.strict.equal(dataset.match(prefix + i, prefix + j, null, '').length, dim)
  }
}
for (i = 0; i < dim; i++) {
  for (j = 0; j < dim; j++) {
    assert.strict.equal(dataset.match(prefix + i, null, prefix + j, '').length, dim)
  }
}
for (i = 0; i < dim; i++) {
  for (j = 0; j < dim; j++) {
    assert.strict.equal(dataset.match(null, prefix + i, prefix + j, '').length, dim)
  }
}
console.timeEnd(TEST)

TEST = `- Finding all ${dimCubed} triples in the default graph ${dimSquared * 3} times (2 variables)`
console.time(TEST)
for (i = 0; i < dim; i++) {
  assert.strict.equal(dataset.match(prefix + i, null, null, '').length, dimSquared)
}
for (j = 0; j < dim; j++) {
  assert.strict.equal(dataset.match(null, prefix + j, null, '').length, dimSquared)
}
for (k = 0; k < dim; k++) {
  assert.strict.equal(dataset.match(null, null, prefix + k, '').length, dimSquared)
}
console.timeEnd(TEST)

console.log()

/* Test quads */
dim /= 4
dimSquared = dim * dim
dimCubed = dimSquared * dim
const dimQuads = dimCubed * dim

dataset = new Dataset()
TEST = `- Adding ${dimQuads} quads`
console.time(TEST)
for (i = 0; i < dim; i++) {
  for (j = 0; j < dim; j++) {
    for (k = 0; k < dim; k++) {
      for (l = 0; l < dim; l++) {
        dataset.add(
          rdf.quad(
            rdf.namedNode(prefix + i),
            rdf.namedNode(prefix + j),
            rdf.namedNode(prefix + k),
            rdf.namedNode(prefix + l)
          )
        )
      }
    }
  }
}
console.timeEnd(TEST)

console.log(`* Memory usage for quads: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`)

TEST = `- Finding all ${dimQuads} quads ${dimCubed * 4} times (3 variables)`
console.time(TEST)
for (i = 0; i < dim; i++) {
  assert.strict.equal(dataset.match(prefix + i, null, null, null).length, dimCubed)
}
for (j = 0; j < dim; j++) {
  assert.strict.equal(dataset.match(null, prefix + j, null, null).length, dimCubed)
}
for (k = 0; k < dim; k++) {
  assert.strict.equal(dataset.match(null, null, prefix + k, null).length, dimCubed)
}
for (l = 0; l < dim; l++) {
  assert.strict.equal(dataset.match(null, null, null, prefix + l).length, dimCubed)
}
console.timeEnd(TEST)
