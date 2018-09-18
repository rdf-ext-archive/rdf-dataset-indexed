const DataFactory = require('@rdfjs/data-model')

const xsd = {
  decimal: 'http://www.w3.org/2001/XMLSchema#decimal',
  boolean: 'http://www.w3.org/2001/XMLSchema#boolean',
  double: 'http://www.w3.org/2001/XMLSchema#double',
  integer: 'http://www.w3.org/2001/XMLSchema#integer',
  string: 'http://www.w3.org/2001/XMLSchema#string'
}

const DEFAULTGRAPH = DataFactory.defaultGraph()

// ### Constructs a term from the given internal string ID
function fromId (id, factory) {
  factory = factory || DataFactory

  // Falsy value or empty string indicate the default graph
  if (!id) {
    return factory.defaultGraph()
  }

  // Identify the term type based on the first character
  switch (id[0]) {
    case '_': return factory.blankNode(id.substr(2))
    case '?': return factory.variable(id.substr(1))
    case '"':
    // Literal without datatype or language
      if (id[id.length - 1] === '"') {
        return factory.literal(id.substr(1, id.length - 2))
      }
      // Literal with datatype or language
      const endPos = id.lastIndexOf('"', id.length - 1)
      return factory.literal(
        id.substr(1, endPos - 1),
        id[endPos + 1] === '@' ? id.substr(endPos + 2) : factory.namedNode(id.substr(endPos + 3))
      )
    default: return factory.namedNode(id)
  }
}

// ### Constructs an internal string ID from the given term or ID string
function toId (term) {
  if (typeof term === 'string') {
    return term
  }
  if (term && !term.equals(DEFAULTGRAPH) && term.id) {
    return term.id
  }
  if (!term) {
    return DEFAULTGRAPH.value
  }

  // Term instantiated with another library
  switch (term.termType) {
    case 'NamedNode': return term.value
    case 'BlankNode': return `_:${term.value}`
    case 'Variable': return `?${term.value}`
    case 'DefaultGraph': return ''
    case 'Literal':
      const datatype = term.datatype && term.datatype.value !== xsd.string ? `^^${term.datatype.value}` : ''
      const language = term.language ? `@${term.language}` : datatype

      return `"${term.value}"${language}`
    default: throw new Error(`Unexpected termType: ${term.termType}`)
  }
}

// ## Module exports
module.exports = {
  fromId,
  toId
}
