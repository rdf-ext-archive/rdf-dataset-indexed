var namespaces = require('./IRIs');
var xsd = namespaces.xsd;
var DataFactory = require('rdf-ext');

var DEFAULTGRAPH = DataFactory.defaultGraph();

// ### Constructs a term from the given internal string ID
function fromId(id, factory) {
  factory = factory || DataFactory;

  // Falsy value or empty string indicate the default graph
  if (!id)
    return factory.defaultGraph();

  // Identify the term type based on the first character
  switch (id[0]) {
  case '_': return factory.blankNode(id.substr(2));
  case '?': return factory.variable(id.substr(1));
  case '"':
    // Shortcut for internal literals
    if (factory === DataFactory)
      return DataFactory.literal(id);
    // Literal without datatype or language
    if (id[id.length - 1] === '"')
      return factory.literal(id.substr(1, id.length - 2));
    // Literal with datatype or language
    var endPos = id.lastIndexOf('"', id.length - 1);
    return factory.literal(id.substr(1, endPos - 1),
            id[endPos + 1] === '@' ? id.substr(endPos + 2)
                                   : factory.namedNode(id.substr(endPos + 3)));
  default:  return factory.namedNode(id);
  }
}

// ### Constructs an internal string ID from the given term or ID string
function toId(term) {
  if (typeof term === 'string')
    return term;
  if (term && !term.equals(DEFAULTGRAPH) && term.id)
    return term.id;
  if (!term)
    return DEFAULTGRAPH.value;

  // Term instantiated with another library
  switch (term.termType) {
  case 'NamedNode':    return term.value;
  case 'BlankNode':    return '_:' + term.value;
  case 'Variable':     return '?' + term.value;
  case 'DefaultGraph': return '';
  case 'Literal':      return '"' + term.value + '"' +
    (term.language ? '@' + term.language :
      (term.datatype && term.datatype.value !== xsd.string ? '^^' + term.datatype.value : ''));
  default: throw new Error('Unexpected termType: ' + term.termType);
  }
}

// ## Module exports
module.exports = {
  fromId:    fromId,
  toId:      toId,
};
