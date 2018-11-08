const {
  mapValues, mapKeys, capitalize,
} = require('lodash');
const {
  pickBy,
  pipe,
  map,
  pick,
} = require('ramda');
const { singular } = require('pluralize');

const { assign } = Object;
const truthy = v => !!v;

exports.generateTags = (config) => {
  const resources = Object.keys(config.resources);
  const r = resources.map(resource => ({
    name: resource,
    description: `${resource} endpoints`,
  }));
  r.push({
    name: 'Auth',
    description: 'Authorization and authentication endpoints',
  });
  return r;
};

exports.generatePaths = (config) => {
  const { resources } = config;
  const endpoints = mapValues(resources, (value, key) => ({
    get: generateGet(key, value),
    post: generatePost(key, value),
  }));
  const idEndpoints = mapValues(resources, (value, key) => ({
    get: generateGetId(key, value),
    put: generatePut(key, value),
    patch: generatePatch(key, value),
    delete: generateDelete(key, value),
  }));
  const r = mapKeys(endpoints, (value, key) => `/${key}`);
  const r2 = mapKeys(idEndpoints, (value, key) => `/${key}/{id}`);
  const r3 = {
    '/auth/users/magic-link': {
      post: {
        summary: 'Use this url to send an email confirmation',

        tags: ['Auth'],

        parameters: [{
          name: 'email',
          in: 'body',
          type: 'string',
          format: 'email',
          required: true,
        }],
        responses: {
          200: {
            description: 'email sent',
            schema: {
              $ref: '#/definitions/PostMagicLink',
            },
          },
          429: {
            description: 'Max amount of active tokens reached',
          },
        },
      },
    },
    '/auth/users/magic-link/:token': {
      get: {
        summary: 'Use this token to confirm an email',
        tags: ['Auth'],
        parameters: [{
          name: 'token',
          in: 'path',
          type: 'string',
          format: 'token',
          required: true,
        }],
        responses: {
          200: {
            description: 'confirmed',
          },
          404: {
            description: 'Not found',
          },
          400: {
            description: 'Something failed on validation',
          },
        },
      },
    },
    '/auth/users/magic-token/:searchToken': {
      get: {
        summary: 'After confirmed use this endpoint to retrieve a JWT token once',

        tags: ['Auth'],
        parameters: [{
          name: 'token',
          in: 'path',
          type: 'string',
          format: 'token',
          required: true,
        }],
        responses: {
          200: {
            description: 'token generated',
            schema: {
              $ref: '#/definitions/GetMagicToken',
            },
          },
          404: {
            description: 'Not found',
          },
          400: {
            description: 'Something failed on validation',
          },
        },
      },
    },
  };
  return { ...r, ...r2, ...r3 };
};

exports.generateDefinitions = (config) => {
  const { resources } = config;
  const r = mapKeys(mapValues(resources, (v, k) => getDefinition(k, v)), (v, k) => `${capitalize(singular(k))}Output`);
  return {
    ...r,
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
  };
};

const pickRootProperties = pick(['resources', 'root', 'port', 'host', 'static', 'staticRoot', 'pagination', 'restricted']);
const pickEndpoindProperties = pick(['get', 'getId', 'put', 'patch', 'delete', 'post']);
const describeEndpoint = (resource) => {

};

const describeResource = (resource) => {
  const result = pipe(
    pickBy(truthy),
    pickEndpoindProperties,
    map(describeEndpoint),
  )(resource);
  return result;
};

const describeResources = config => ((!config.resources)
  ? config
  : assign(config, {
    resources: pipe(
      pickBy(truthy),
      map(describeResource),
    )(config.resources),
  }));

/**
 * Generates a mongo server description
 * @param {object} config Moser Object
 */
exports.describeServer = (config) => {
  const result = pipe(pickRootProperties, describeResources)(config);
  return result;
};
