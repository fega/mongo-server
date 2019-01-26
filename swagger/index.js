const express = require('express');
const { mapValues, mapKeys, capitalize } = require('lodash');
const { singular } = require('pluralize');
const swaggerUi = require('swagger-ui-express');
const pkg = require('../package');
const moserConfig = require('../main');
const {
  generateDelete, generateGet, generateGetId, generatePatch, generatePost, generatePut,
  getDefinition,
} = require('./util');

const app = express();


const swagger = {
  swagger: '2.0',
  info: {
    description: pkg.description,
    version: pkg.version,
    title: moserConfig.appName,
    host: moserConfig.host,
    basePath: moserConfig.root,
    contact: {
      email: 'fega.hg@gmail.com',
    },
  },
  schemes: [
    'https',
    'http',
  ],
  tags: generateTags(moserConfig),
  paths: generatePaths(moserConfig),
  definitions: generateDefinitions(moserConfig),
  securityDefinitions: {
    permissions: {
      type: 'apiKey',
      authorizationUrl: 'http://herd.fyi/auth/users/magic-link',
      in: 'header',
      scopes: {
        'email:verified': 'Email verified',
      },
    },
  },
};

app.use('/', swaggerUi.serve, swaggerUi.setup(swagger));

app.listen(5000);


function generateTags(config) {
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
}

function generatePaths(config) {
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
}

function generateDefinitions(config) {
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
}
