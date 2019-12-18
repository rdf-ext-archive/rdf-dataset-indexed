import { BaseQuad, DataFactory, DatasetCore, Quad } from 'rdf-js';

declare function datasetFactory<Q extends BaseQuad = Quad>(quads?: Array<Q>, dataFactory?: DataFactory): DatasetCore<Q>;

export default datasetFactory;
