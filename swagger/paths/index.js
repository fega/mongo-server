const {
  mapValues, mapKeys, get, capitalize, pickBy,
} = require('lodash');
const { plural, singular } = require('pluralize');


const produces = ['application/json'];

// SECURITY
const getSecurity = (resourceConfig, requestType) => {
  const permissions = [
    ...get(resourceConfig, `${requestType}.permissions`) || [],
    ...get(resourceConfig, 'permissions') || [],
  ];
  if (permissions) {
    return {
      security: {
        permissions,
      },
    };
  }
  return {};
};
// RESPONSES
const get200Responses = (key, resourceConfig, requestType) => {
  if (requestType === 'get') {
    return {
      description: 'successful operation',
      schema: {
        type: 'array',
        items: {
          $ref: `#/definitions/${singular(capitalize(key))}Output`,
        },
      },
    };
  }
  if (['post', 'getId', 'put', 'patch'].includes(requestType)) {
    return {
      description: 'successful operation',
      schema: {
        $ref: `#/definitions/${singular(capitalize(key))}Output`,
      },
    };
  }
  return undefined;
};
const get204Resposes = (key, resourceConfig, requestType) => {
  if (requestType === 'delete') {
    return {
      description: 'success, no body',
    };
  }
  return undefined;
};
const getResponses = (key, resourceConfig, requestType) => {
  const responses = {
    responses: {
      200: get200Responses(key, resourceConfig, requestType),
      400: {
        description: 'Validation failed',
      },
      403: {
        description: 'forbiden',
      },
      401: {
        description: 'unauthorized',
      },
      404: {
        description: 'Not found',
      },
      204: get204Resposes(key, resourceConfig, requestType),
    },
  };
  return responses;
};


// PARAMETERS
const getIdParameters = (key, resourceConfig, requestType) => {
  if (['getId', 'put', 'patch', 'delete'].includes(requestType)) {
    return [{
      name: 'id',
      in: 'path',
      description: `ID of ${singular(key)}`,
      required: true,
      type: 'string',
    }];
  }
  return [];
};
const getParameterType = (name, describeObj) => {
  const value = get(describeObj, 'type');
  if (value === 'number') {
    if (get(describeObj, 'rules[0].name') === 'integer') return 'integer';
  }
  return value;
};
const getParameterDescription = (name, value) => {
  if (value) return value;
  if (name.includes('_id')) {
    return `a ${name.replace('_id', '')} ID`;
  }
  return undefined;
};
const getParameter = (name, described) => pickBy({
  name,
  in: 'body',
  require: get(described, 'flags.presence'),
  type: getParameterType(name, described),
  enum: get(described, 'valids'),
  description: getParameterDescription(name, get(described, 'description')),
}, v => v);
const getBodyParameters = (key, resourceConfig, requestType) => {
  const described = get(resourceConfig, 'in.body');
  if (!described) return [];

  const fields = Object.keys(described);


  if (['post', 'put', 'patch'].includes(requestType)) {
    return fields.map(name => getParameter(name, described[name]));
  }
  return [];
};
const getQueryParameters = (key, resourceConfig, requestType) => {
  if (requestType === 'get') {
    return [{
      name: '$page',
      in: 'query',
      description: "Resource pagination's page",
      type: 'integer',
      minimum: 0,
      default: 0,
    }, {
      name: '$limit',
      in: 'query',
      description: 'Quantity of results',
      type: 'integer',
      minimum: 1,
      default: 10,
    }, {
      name: '$sort',
      in: 'query',
      description: 'Sort by a field name',
      type: 'string',
    }, {
      name: '$order',
      in: 'query',
      description: 'Sort order',
      type: 'string',
      enum: ['asc', 'desc'],
    }, {
      name: '$populate',
      in: 'query',
      description: 'Populates a resource type with their childs, more info here https://github.com/fega/mongo-server#relationships',
      type: 'string',
    }, {
      name: '$fill',
      in: 'query',
      description: 'Populates a resource type with their parents, more info here https://github.com/fega/mongo-server#relationships',
      type: 'string',
    }, {
      name: 'filters',
      in: 'query',
      description: 'filters a response you can use any valid resource field name as parameter name, more info: https://github.com/fega/mongo-server#filter',
      type: 'string',
    }];
  }
  return [];
};
const getParameters = (key, resourceConfig, requestType) => ({
  parameters: [
    ...getIdParameters(key, resourceConfig, requestType),
    ...getBodyParameters(key, resourceConfig, requestType),
    ...getQueryParameters(key, resourceConfig, requestType),
  ],
});

const getGetAnsPostPathObject = (resource, name) => {
  if (!get(resource, 'get')) return {};

  return {
    get: {
      tags: [name],
      produces,
      ...getSecurity(resource, 'get'),
      ...getResponses(name, getResponses, 'get'),
      ...getParameters(name, resource, 'get'),
    },
  };
};

const getGetPath = (resource, name) => `/${plural(name)}`;
const getIdGetPath = (resource, name) => `/${plural(name)}/{id}`;
module.exports = (description) => {
  const { resources } = description;

  if (!resources) return {};

  const getPaths = mapKeys(mapValues(resources, getGetAnsPostPathObject), getGetPath);
  const getIdPaths = mapKeys(mapValues(resources, getGetAnsPostPathObject), getIdGetPath);

  return { ...getPaths, ...getIdPaths };
};
