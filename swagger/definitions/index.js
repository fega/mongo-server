const Joi = require('joi');
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

const generateInputDefinition = (resource) => {
  if (!get(resource, 'in.body.children')) return {};
  const { children } = resource.in.body;
  const result = {
    type: 'object',
    properties: mapValues(children, (value, name) => ({
      type: value.type,
      description: value.description || `${capitalize(name)} field`,
      enum: get(value, 'valids'),
      required: get('value.flags.presence') === 'required',
    })),
  };

  return result;
};
const generateOutputDefinition = (resource) => {
  if (!get(resource, 'out')) return {};
  const { out } = resource;
  const result = {
    type: 'object',
    properties: mapValues(out, (value, name) => ({
      type: value.type || 'string',
      description: value.description || `${capitalize(name)} field`,
      enum: get(value, 'valids'),
      required: get('value.flags.presence') === 'required',
    })),
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
