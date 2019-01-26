const Joi = require('joi');
const { singular } = require('pluralize');
const {
  mapKeys, mapValues, get, capitalize,
} = require('lodash');

const generateSecurityDefinitions = () => ({
  PostMagicLink: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'search token',
      },
    },
  },
  GetMagicToken: {
    type: 'object',
    properties: {
      $token: {
        type: 'string',
        description: 'User JWT token',
      },
    },
  },
});


const getDefinition = (key, resourceConfig) => {
  /**
   * retrieve information from output function
   */
  const outObj = get(resourceConfig, 'out');
  /**
   * retrieve information from input
   */
  const body = get(resourceConfig, 'in.body');
  const described = mapValues(body, fields => Joi.describe(fields));
  const result = {
    name: `${capitalize(singular(key))}Output`,
    type: 'object',
    properties: getDefinitionProperties(key, outObj, described),
  };
  return result;
};

exports.generateDefinitions = (description) => {
  const { resources } = description;
  if (!resources) return {};
  const r = mapKeys(mapValues(resources, (v, k) => getDefinition(k, v)), (v, k) => `${capitalize(singular(k))}Output`);
  return {
    ...r,
  };
};
