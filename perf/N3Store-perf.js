#!/usr/bin/env node
const assert = require('assert')
if (!assert.hasOwnProperty('strict')) {
  assert.strict = {
    equal: assert.equal, // eslint-disable-line
    deepEqual: assert.deepEqual // eslint-disable-line
  }
}
const rdf = require('@rdfjs/data-model')

const datasetFactory = require('..')
let dataset = datasetFactory()

// const rdfjsDataset = require('@rdfjs/dataset')
// const datasetFactory = () => rdfjsDataset.dataset()
// let dataset = datasetFactory()

console.log('N3Store performance test')

const prefix = 'http://example.org/#'
const prefixed = (term) => rdf.namedNode(`${prefix}${term}`)

/* Test triples */
let dim = parseInt(process.argv[2], 10) || 64
let dimSquared = dim * dim
let dimCubed = dimSquared * dim

let TEST = `- Adding ${dimCubed} triples to the default graph`
console.time(TEST)
let i, j, k, l
for (i = 0; i < dim; i++) {
  for (j = 0; j < dim; j++) {
    for (k = 0; k < dim; k++) {
      dataset.add(
        rdf.quad(
          prefixed(i),
          prefixed(j),
          prefixed(k)
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
      assert.strict.equal(dataset.match(prefixed(i), prefixed(j), prefixed(k), '').size, 1)
    }
  }
}
console.timeEnd(TEST)

TEST = `- Finding all ${dimCubed} triples in the default graph ${dimSquared * 2} times (1 variable)`
console.time(TEST)
for (i = 0; i < dim; i++) {
  for (j = 0; j < dim; j++) {
    assert.strict.equal(dataset.match(prefixed(i), prefixed(j), null, '').size, dim)
  }
}
for (i = 0; i < dim; i++) {
  for (j = 0; j < dim; j++) {
    assert.strict.equal(dataset.match(prefixed(i), null, prefixed(j), '').size, dim)
  }
}
for (i = 0; i < dim; i++) {
  for (j = 0; j < dim; j++) {
    assert.strict.equal(dataset.match(null, prefixed(i), prefixed(j), '').size, dim)
  }
}
console.timeEnd(TEST)

TEST = `- Finding all ${dimCubed} triples in the default graph ${dimSquared * 3} times (2 variables)`
console.time(TEST)
for (i = 0; i < dim; i++) {
  assert.strict.equal(dataset.match(prefixed(i), null, null, '').size, dimSquared)
}
for (j = 0; j < dim; j++) {
  assert.strict.equal(dataset.match(null, prefixed(j), null, '').size, dimSquared)
}
for (k = 0; k < dim; k++) {
  assert.strict.equal(dataset.match(null, null, prefixed(k), '').size, dimSquared)
}
console.timeEnd(TEST)

console.log()

/* Test quads */
dim /= 4
dimSquared = dim * dim
dimCubed = dimSquared * dim
const dimQuads = dimCubed * dim

dataset = datasetFactory()
TEST = `- Adding ${dimQuads} quads`
console.time(TEST)
for (i = 0; i < dim; i++) {
  for (j = 0; j < dim; j++) {
    for (k = 0; k < dim; k++) {
      for (l = 0; l < dim; l++) {
        dataset.add(
          rdf.quad(
            prefixed(i),
            prefixed(j),
            prefixed(k),
            prefixed(l)
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
  assert.strict.equal(dataset.match(prefixed(i), null, null, null).size, dimCubed)
}
for (j = 0; j < dim; j++) {
  assert.strict.equal(dataset.match(null, prefixed(j), null, null).size, dimCubed)
}
for (k = 0; k < dim; k++) {
  assert.strict.equal(dataset.match(null, null, prefixed(k), null).size, dimCubed)
}
for (l = 0; l < dim; l++) {
  assert.strict.equal(dataset.match(null, null, null, prefixed(l)).size, dimCubed)
}
console.timeEnd(TEST)
