const HttpError = require('http-errors');
const flattenObject = require('flattenjs');
const {
  flatten, omit, get, mapValues,
} = require('lodash');
const pluralize = require('pluralize');

const { isArray } = Array;

exports.getTextQuery = () => ({});

exports.getRegexQuery = () => ({});
exports.getRangeQuery = () => ({});


/**
 * convert a sort and order query to a filter
 * @param {String|Array} sort Sort query parameter
 * @param {String|Array} order Order query parameter
 */
exports.getSort = (sort, order = []) => {
  if (!sort) return {};

  if (Array.isArray(sort)) {
    const r = {};
    sort.forEach((field, index) => { r[field] = order[index] === 'desc' ? -1 : 1; });
    return r;
  }

  const r = {
    [sort]: order === 'desc' ? -1 : 1,
  };
  return r;
};
/**
 * convert filter query params to a filtering mongodb
 * @param {*} filters
 */
exports.getFilters = (filters = {}) => {
  const flat = Object.keys(flattenObject.convert(filters));
  if (flat.some(v => v.includes('$'))) throw new HttpError(400, 'unsafe query parameter');
  return filters;
};
/**
 * Creates a pipeline to populate a field
 * @param {String} $populate Field to populate
 * @param {String} resource Resource
 */
const getPopulatePipeline = ($populate, resource) => {
  const prePopulate1 = `____${$populate}`;
  const prePopulate2 = `__${$populate}`;

  const pipeline = [
    {
      $lookup:
      {
        from: $populate,
        localField: '_id',
        foreignField: `${pluralize.singular(resource)}_id`,
        as: prePopulate1,
      },
    },
    {
      $lookup:
      {
        from: $populate,
        localField: '_id',
        foreignField: `${pluralize.singular(resource)}_ids`,
        as: prePopulate2,
      },
    },
  ];
  return pipeline;
};
/**
 * Creates a pipeline to fill a field
 * @param {String} $fill Field to populate
 * @param {String} resource Resource
 */
const getFillPipeline = ($fill, resource) => {
  const preParent1 = `----${$fill}`;
  const preParent2 = `--${$fill}`;
  const pipeline = [{
    $lookup:
    {
      from: resource,
      localField: `${pluralize.singular($fill)}_id`,
      foreignField: '_id',
      as: preParent1,
    },
  }, {
    $lookup:
    {
      from: resource,
      localField: `${pluralize.singular($fill)}_ids`,
      foreignField: '_id',
      as: preParent2,
    },
  }];

  return pipeline;
};
/**
 * get populated pipelines
 * @param {String|Array} $populate Populate Query parameter
 * @param {String|Array} $fill
 * @param {Object} resource
 */
exports.getPopulatePipelines = ($populate, $fill, resource) => {
  const result = [];
  if (Array.isArray($populate)) {
    $populate.forEach(populate => result
      .push(...getPopulatePipeline(populate, resource)));
  } else if ($populate) {
    result.push(...getPopulatePipeline($populate, resource));
  }
  if (Array.isArray($fill)) {
    $fill.forEach(fill => result
      .push(...getFillPipeline(fill, resource)));
  } else if ($fill) {
    result.push(...getFillPipeline($fill, resource));
  }
  return result;
};

exports.unrollPopulatePipeline = (populate = [], fill = [], result) => {
  const $populate = Array.isArray(populate) ? populate : [populate];
  const $fill = Array.isArray(fill) ? fill : [fill];
  return result.map((object) => {
    // populate processing
    const partialObject = omit(
      object,
      flatten($populate.map(field => [`____${field}`, `__${field}`])),
      flatten($fill.map(field => [`----${field}`, `--${field}`])),
    );
    const complete = Object.assign(
      partialObject,
      ...$populate.map(field => ({ [field]: [...object[`____${field}`], ...object[`__${field}`]] })),
      ...$fill.map(field => ({ [field]: [...object[`----${field}`], ...object[`--${field}`]] })),
    );
    return complete;
  });
};

exports.getQuery = (query = '{}') => {
  try {
    return JSON.parse(query);
  } catch (err) {
    throw new HttpError(400, "INVALID '$query' parameter");
  }
};

exports.getNumber = (number, def = 0) => {
  const r = parseInt(number, 10);
  if (Number.isNaN(r)) return def;
  return r;
};

const processOut = (config, user, fieldsToPopulate, item, out) => {
  const object = out ? out(item, user) : item;
  if (fieldsToPopulate.length === 0) return object;
  return mapValues(object, (value, key) => {
    if (!fieldsToPopulate.includes(key) || !isArray(value)) return value;
    const fn = get(config, `resources.${key}.out`);
    return value.map(nestedItem => fn(nestedItem, user));
  });
};

exports.getOut = (resourceName, resources, config, user, $populate, $fill) => {
  const populate = Array.isArray($populate) ? $populate : [$populate];
  const fill = Array.isArray($fill) ? $fill : [$fill];
  const fieldsToPopulate = [...populate, ...fill].filter(rName => get(config, `resources.${rName}.out`));
  const out = get(config, `resources.${resourceName}.out`);
  if (Array.isArray(resources)) {
    return resources.map(item => processOut(config, user, fieldsToPopulate, item, out));
  }
  return processOut(config, user, fieldsToPopulate, resources, out);
};
