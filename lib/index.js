const HttpError = require('http-errors');
const flattenObject = require('flattenjs');
const { ObjectId } = require('mongodb');
const {
  flatten, omit, get, mapValues, pick, omitBy, isString, reduce, merge, isFunction,
} = require('lodash');
const pluralize = require('pluralize');
const isSafeRegex = require('safe-regex');

const { isArray } = Array;
const isFlag = key => key.includes('$$');
const tryParse = (item, error = 'Invalid JSON') => {
  try {
    return JSON.parse(item);
  } catch (err) {
    throw new HttpError.BadRequest(error);
  }
};
exports.getTextQuery = () => ({});
exports.getRegexQuery = ($regex) => {
  if (!$regex) return {};
  const EVIL_REGEX = /[[(+*{}?]/;
  /** @type {Array<string>} */
  const value = tryParse($regex, 'Invalid $regex');
  if (!isArray(value)) throw new HttpError.BadRequest('$regex should be an array');
  if (value.length < 2) throw new HttpError.BadRequest('$regex minimal length is 2');
  if (value.some(i => !isString(i))) throw new HttpError.BadRequest('$regex format is Array<string>');
  const [field, regex, flags] = value;
  if (!isSafeRegex(regex)) throw new HttpError.BadRequest('unsafe $regex');
  if (EVIL_REGEX.test(regex)) throw new HttpError.BadRequest('unsafe $regex');
  return {
    [field]: {
      $regex: regex,
      $options: flags || 'i',
    },
  };
};

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
 * get the key of a filter
 * @param {string} value Value
 * @param {string} key Key
 */
const getFilterKey = (value, key) => {
  const split = key.split(':');
  if (!split[1]) return key;
  return split[0];
};
/**
 * Coerces a filter value
 * @param {string} value filter value
 * @param {string} coerce coercion modifier
 * @return {string|number|Date|ObjectId | boolean}
 */
const coerceFilterValue = (value, coerce) => {
  const number = parseFloat(value);
  switch (coerce) {
    case 'date': return new Date(value);
    case 'number': return parseFloat(value);
    case 'id': return new ObjectId(value);
    case 'bool': return !!value;
    default:
      if (!Number.isNaN(number)) return number;
      return value;
  }
};

/**
 * Get value of the filter
 * @param {string} value
 * @param {string} key
 */
const getFilterValue = (value, key) => {
  const [, modifier, coerce] = key.split(':');

  if (!modifier) return { $eq: value };
  if (modifier === 'ne') return { $ne: coerceFilterValue(value, coerce) };
  if (modifier === 'gt') return { $gt: coerceFilterValue(value, coerce) };
  if (modifier === 'lt') return { $lt: coerceFilterValue(value, coerce) };
  if (modifier === 'lte') return { $lte: coerceFilterValue(value, coerce) };
  if (modifier === 'gte') return { $gte: coerceFilterValue(value, coerce) };
  if (modifier === 'size') return { $size: coerceFilterValue(value, coerce) };
  if (modifier === 'nin') return { $nin: Array.isArray(value) ? value.map(v => coerceFilterValue(v, coerce)) : [coerceFilterValue(value, coerce)] };
  if (modifier === 'in') return { $in: Array.isArray(value) ? value.map(v => coerceFilterValue(v, coerce)) : [coerceFilterValue(value, coerce)] };

  if (modifier === 'date') return { $eq: new Date(value) };
  if (modifier === 'id') return { $eq: new ObjectId(value) };
  if (modifier === 'number') return { $eq: parseFloat(value) };
  if (modifier === 'bool') return { $eq: !!value };

  throw new HttpError.BadRequest('Invalid Filter modifier');
};

const filterParserReducer = (prev, value, key) => ({
  ...prev,
  [getFilterKey(value, key)]: merge(getFilterValue(value, key), prev[getFilterKey(value, key)]),
});

/**
 * convert filter query params to a filtering mongodb
 * @param {object} filters
 */
exports.getFilters = (filters = {}) => {
  const filtersWithoutFLags = omitBy(filters, (_, key) => isFlag(key));
  const flat = Object.keys(flattenObject.convert(filtersWithoutFLags));

  if (flat.some(v => v.includes('$'))) throw new HttpError.BadRequest('unsafe query parameter');

  const filterParsed = reduce(filtersWithoutFLags, filterParserReducer, {});
  return filterParsed;
};

/** @typedef {object} PopulationConfig
 *  @property {string} $match
 *  @property {string} $sort
 *  @property {string} $order
 *  @property {string} $limit
 */

/**
 *
 * @param {PopulationConfig} config
 */
const getLookupPipeline = (config, foreignField, user) => {
  const pipeline = [];

  const {
    $sort, $limit, $order, $match = {},
  } = config;

  if (isFunction($match)) {
    pipeline.push({
      $match: {
        ...$match(user),
        $expr: { $eq: [`$${foreignField}`, `$$${foreignField}`] },
      },
    });
  } else {
    pipeline.push({
      $match: {
        ...$match,
        $expr: { $eq: [`$${foreignField}`, `$$${foreignField}`] },
      },
    });
  }


  if ($sort) {
    pipeline.push({ $sort: { [$sort]: $order === 'desc' ? -1 : 1 } });
  }
  if ($limit) {
    pipeline.push({ $limit });
  }
  return pipeline;
};

/**
 * Creates a Mongodb pipeline to populate a field
 * @param {string} $populate Field to populate
 * @param {string} resource Resource
 * @param {object} config
 * @param {import('express').Request} request
 */
const getPopulatePipeline = ($populate, resource, config, request) => {
  const prePopulate1 = `____${$populate}`;
  const prePopulate2 = `__${$populate}`;

  const foreignField = `${pluralize.singular(resource)}_id`;

  const lookupPipeline1 = config
    ? {
      pipeline: getLookupPipeline(config, foreignField, request),
      let: { [foreignField]: '$_id' },
    }
    : false;
  const lookupPipeline2 = config
    ? {
      pipeline: getLookupPipeline(config, `${foreignField}s`, request),
      let: { [`${foreignField}s`]: '$_id' },
    }
    : false;

  const fields1 = { localField: '_id', foreignField };
  const fields2 = { localField: '_id', foreignField: `${foreignField}s` };

  const pipeline = [
    {
      $lookup:
      {
        from: $populate,
        as: prePopulate1,
        ...lookupPipeline1 ? false : fields1,
        ...lookupPipeline1,
      },
    },
    {
      $lookup:
      {
        from: $populate,
        as: prePopulate2,
        ...lookupPipeline2 ? false : fields2,
        ...lookupPipeline2,
      },
    },
  ];

  return pipeline;
};

/**
 * Creates a Mongodb pipeline to fill a field
 * @param {String} $fill Field to populate
 */
const getFillPipeline = ($fill) => {
  const preParent1 = `----${$fill}`;
  const preParent2 = `--${$fill}`;
  const pipeline = [{
    $lookup:
    {
      from: $fill,
      localField: `${pluralize.singular($fill)}_id`,
      foreignField: '_id',
      as: preParent1,
    },
  }, {
    $lookup:
    {
      from: $fill,
      localField: `${pluralize.singular($fill)}_ids`,
      foreignField: '_id',
      as: preParent2,
    },
  }];

  return pipeline;
};

/**
 * get populated pipelines based of the moser query parameters
 * @param {string|Array<string>} $populate Populate Query parameter
 * @param {string|Array<string>} $fill Fill query parameter
 * @param {Object} resource resource name
 */
exports.getPopulatePipelines = ($populate, $fill, resource, populateConfig = {}, user) => {
  const result = [];
  if (Array.isArray($populate)) {
    $populate.forEach(populate => result
      .push(
        ...getPopulatePipeline(
          populate,
          resource,
          populateConfig[populate],
          user,
        ),
      ));
  } else if ($populate) {
    result.push(...getPopulatePipeline(
      $populate,
      resource,
      populateConfig[$populate],
      user,
    ));
  }
  if (Array.isArray($fill)) {
    $fill.forEach(fill => result
      .push(...getFillPipeline(fill)));
  } else if ($fill) {
    result.push(...getFillPipeline($fill));
  }
  return result;
};

/**
 * process the result of the aggregation pipelines generated by getPopulatePipelines and get
 * propers results
 * @param {string|array} populate Populate query parameter
 * @param {string|array} fill Fill query parameter
 * @param {Array} result Result of the populated pipelines generated by getPopulatePipelines
 */
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

/**
 * Parses a $query parameter.
 * @param {String} query Query to parse
 * @param {Object} config Config object
 */
exports.getQuery = (query = '{}', config) => {
  let result;
  try {
    result = JSON.parse(query);
  } catch (err) {
    throw new HttpError.BadRequest("INVALID '$query' parameter");
  }
  if (get(config, 'settings.restrictWhereQuery') && result.$where) {
    throw new HttpError.BadRequest('Invalid $where inside $query parameter');
  }
  if (result.$expr) {
    throw new HttpError.BadRequest('Invalid $expr inside $query parameter');
  }
  if (query.includes('$regex')) {
    throw new HttpError.BadRequest('Invalid $regex inside $query parameter');
  }
  return result;
};

/**
 * Tries to coerce in a integer the number parameter, if it is not possible returns def
 * @param {any} number Object to parse
 * @param {number} def Default value
 */
exports.getNumber = (number, def = 0) => {
  const r = parseInt(number, 10);
  if (Number.isNaN(r)) return def;
  return r;
};

const processSelect = $select => (item) => {
  if (!$select) return item;
  const pickThis = Array.isArray($select) ? $select : [$select];
  return pick(item, pickThis);
};

const processOut = (config, user, fieldsToPopulate, item, out, $select) => {
  const object = out ? out(item, user) : item;
  const select = processSelect($select);
  if (fieldsToPopulate.length === 0) return select(object);
  return mapValues(object, (value, key) => {
    if (!fieldsToPopulate.includes(key) || !isArray(value)) return select(value);
    const fn = get(config, `resources.${key}.out`);
    return value.map(nestedItem => select(fn(nestedItem, user)));
  });
};

/**
 * Process the output of a request
 * @param {string} resourceName resource name
 * @param {Array|Object} resources Resources to process
 * @param {Object} config Moser config object
 * @param {Object} [user] req.user
 * @param {string|array} [$populate] Populate parameter of the query
 * @param {string|array} [$fill] Fill parameter of the query
 * @param {string|array} [$fill] Fill parameter of the query
 */
exports.getOut = (resourceName, resources, config, user, $populate, $fill, $select) => {
  const populate = Array.isArray($populate) ? $populate : [$populate];
  const fill = Array.isArray($fill) ? $fill : [$fill];
  const fieldsToPopulate = [...populate, ...fill].filter(rName => get(config, `resources.${rName}.out`));
  const out = get(config, `resources.${resourceName}.out`);
  if (Array.isArray(resources)) {
    return resources.map(item => processOut(config, user, fieldsToPopulate, item, out, $select));
  }
  return processOut(config, user, fieldsToPopulate, resources, out);
};

/**
 *
 * @param {Object} object Object returned by the default function
 * @param {*} user
 * @param {*} req
 * @param {*} db
 */
exports.getDefaultPost = async (object, user, req, db) => {
  const result = {};
  const {
    $owner, $timestamps, $version, $changelog, ...rest
  } = object;
  if ($owner && user) {
    result[`${pluralize.singular(user.resource)}_id`] = get(user, '_id');
  }
  if ($timestamps) {
    const now = new Date();
    if (req.method === 'POST') result.createdAt = now;
    result.updatedAt = now;
  }
  if ($version) {
    result.__v = 0;
  }
  if ($changelog) {
    await db.collection(`${req.params.resource}.logs`).insert({
      user: req.user,
      date: new Date(),
      path: req.path,
    });
  }
  return {
    ...result,
    ...rest,
  };
};
