const { singular } = require('pluralize');
const {
  mapKeys, mapValues, get, capitalize,
} = require('lodash');

// const generateSecurityDefinitions = () => ({
//   PostMagicLink: {
//     type: 'object',
//     properties: {
//       search: {
//         type: 'string',
//         description: 'search token',
//       },
//     },
//   },
//   GetMagicToken: {
//     type: 'object',
//     properties: {
//       $token: {
//         type: 'string',
//         description: 'User JWT token',
//       },
//     },
//   },
// });

// const gener


// const getDefinition = (key, resourceConfig) => {
//   /**
//    * retrieve information from output function
//    */
//   const outObj = get(resourceConfig, 'out');
//   /**
//    * retrieve information from input
//    */
//   const body = get(resourceConfig, 'in.body');
//   const described = mapValues(body, fields => Joi.describe(fields));
//   const result = {
//     name: `${capitalize(singular(key))}Output`,
//     type: 'object',
//     properties: getDefinitionProperties(key, outObj, described),
//   };
//   return result;
// };

const getType = (value) => {
  if (value.rules && value.rules.some(rule => rule.name === 'integer')) {
    return 'integer';
  }
  const _value = Array.isArray(value.type) ? value.type[0] : value.type;
  return _value || 'string';
};
const getMin = (value) => {
  if (
    value.type === 'number'
    && value.rules
    && value.rules.some(rule => rule.name === 'min')
  ) {
    return value.rules.find(rule => rule.name === 'min').arg;
  }
  return undefined;
};
const getMax = (value) => {
  if (
    value.type === 'number'
    && value.rules
    && value.rules.some(rule => rule.name === 'max')
  ) {
    return value.rules.find(rule => rule.name === 'max').arg;
  }
  return undefined;
};
const getFormat = (value, name) => {
  if (value.rules && value.rules.some(rule => rule.name === 'alphanum')) {
    return 'alphanum';
  }
  if (value.rules && value.rules.some(rule => rule.name === 'uri')) {
    return 'uri';
  }
  if (value.rules && value.rules.some(rule => rule.name === 'url')) {
    return 'url';
  }
  return undefined;
};
const getMaxLength = (value) => {
  if (
    value.type === 'string'
    && value.rules
    && value.rules.some(rule => rule.name === 'max')
  ) {
    return value.rules.find(rule => rule.name === 'max').arg;
  }
  return undefined;
};
const getMinLength = (value) => {
  if (
    value.type === 'string'
    && value.rules
    && value.rules.some(rule => rule.name === 'min')
  ) {
    return value.rules.find(rule => rule.name === 'min').arg;
  }
  return undefined;
};


const getItems = (value) => {
  const type = getType(value);
  if (type === 'array') {
    const itemValue = value.items[0];
    return {
      type: getType(itemValue),
      description: itemValue.description,
      enum: get(itemValue, 'valids'),
      // required: get(itemValue, 'flags.presence') === 'required' || undefined,
      minimum: getMin(itemValue),
      maximum: getMax(itemValue),
      maxLength: getMaxLength(itemValue),
      minLength: getMinLength(itemValue),
      items: getItems(itemValue),
    };
  }
  return undefined;
};


const generateInputDefinition = (resource) => {
  if (!get(resource, 'in.body.children')) return {};
  const { children } = resource.in.body;
  const result = {
    type: 'object',
    properties: // console.log(name, value);
      mapValues(children, (value, name) => ({
        type: getType(value),
        description: value.description || `${capitalize(name)} field`,
        enum: get(value, 'valids'),
        // required: get(value, 'flags.presence') === 'required' || undefined,
        minimum: getMin(value),
        maximum: getMax(value),
        format: getFormat(value, name),
        maxLength: getMaxLength(value),
        minLength: getMinLength(value),
        items: getItems(value),
      })),
  };

  return result;
};
const generateOutputDefinition = (resource) => {
  if (!get(resource, 'out')) return {};
  const { out } = resource;
  const result = {
    type: 'object',
    properties: mapValues(out, (value, name) => {
      const _value = get(resource, `in.body.children[${name}]`, value);
      return {
        type: getType(_value),
        description: value.description || `${capitalize(name)} field`,
        enum: get(_value, 'valids'),
        minimum: getMin(_value),
        maximum: getMax(_value),
        format: getFormat(_value, name),
        maxLength: getMaxLength(_value),
        minLength: getMinLength(_value),
        items: getItems(_value),
      };
    }),
  };

  return result;
};

const generateInputDefinitions = (resources) => {
  const values = mapValues(resources, generateInputDefinition);
  const renamed = mapKeys(values, (v, k) => `${capitalize(singular(k))}Input`);

  return renamed;
};
const generateOutputDefinitions = (resources) => {
  const values = mapValues(resources, generateOutputDefinition);
  const renamed = mapKeys(values, (v, k) => `${capitalize(singular(k))}Output`);

  return renamed;
};


module.exports = (description) => {
  const { resources } = description;
  if (!resources) return {};
  const inputDefinitions = generateInputDefinitions(resources);
  const outputDefinitions = generateOutputDefinitions(resources);
  return { ...inputDefinitions, ...outputDefinitions };
  // const definitions = mapValues(resources, (v, k) => getDefinition(k, v));
  // const r = mapKeys(definitions,
  //   (v, k) => `${capitalize(singular(k))}Output`,
  // );
  // return {
  //   ...r,
  // };
};
