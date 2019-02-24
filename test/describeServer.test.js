/* eslint-env node, mocha */
const chai = require('chai');
const Joi = require('joi');
const { give } = require('loy');
const { describeServer: ds } = require('../swagger/util');
const { swagger } = require('../swagger/generator');
const swaggerResult = require('./swagger.super.json');

const a = chai.assert;

const superConfig = {
  appName: 'Doggy',
  resources: {
    dogs: {
      description: 'Dog resources',
      permissions: ['dogs'],
      in: {
        body: {
          name: Joi.string(),
          array: Joi.array().items(Joi.string()),
        },
        query: {
          hello: Joi.string(),
        },
        params: {
          hello: Joi.string(),
        },
      },
      auth: {
        local: ['user', 'password'],
        magicLink: {
        },
        magicCode: {

        },
      },
      out: resource => ({
        name: resource.name,
        horses: resource.horses,
        horses_id: resource.horses_id,
        horses_ids: resource.horses_id,
        createdAt: resource.createdAt,
        updatedAt: resource.updatedAt,
      }),
      get: {},
      getId: {},
      notHelpful: {},
      patch: false,
      delete: ['admin'],
    },
    cats: false,
    horses: {
      out: resource => ({
        hello: give(resource.hello).as('string').description('a field').ok(),
      }),
      getId: true,
    },
    dragons: true,
  },
};


suite('describeServer()');
test('describeServer({})', () => {
  a.deepEqual(ds({}), {});
});
test('describeServer({sensibleInfo})', () => {
  a.deepEqual(ds({
    jwtSecret: 1,
  }), {});
});
test('describeServer({rootProperties})', () => {
  a.deepEqual(ds({
    jwtSecret: 1,
    port: 3000,
    root: '/',
    host: 'http://localhost:3000',
    mongo: 'mongodb://localhost:27088',
    db: 'dbName',
    cors: { origin: true },
    compress: {},
    helmet: {},
    static: 'public',
    staticRoot: '/',
    middleware: [],
    pagination: 10,
  }), {
      port: 3000,
      root: '/',
      host: 'http://localhost:3000',
      static: 'public',
      staticRoot: '/',
      pagination: 10,
    });
});
test('describeServer({resources:{}})', () => {
  a.deepEqual(ds({ resources: {} }), { resources: {} });
});
test('describeServer({resources:{dogs:false}})', () => {
  a.deepEqual(ds({
    resources: {
      dogs: false,
    },
  }), { resources: {} });
});
test.skip('describeServer(superConfig)', () => {
  a.deepEqual(ds(superConfig), {
    appName: 'Doggy',

    resources: {
      dogs: {
        description: 'Dog resources',
        delete: {
          permissions: ['admin'],
        },
        permissions: ['dogs'],
        put: {},
        in: {
          body: {
            children: {
              name: {
                invalids: [
                  '',
                ],
                type: 'string',
              },
              array: {
                flags: {
                  sparse: false,
                },
                items: [
                  {
                    invalids: [
                      '',
                    ],
                    type: 'string',
                  },
                ],
                type: 'array',
              },
            },
            type: 'object',

          },
          query: {
            children: {
              hello: {
                invalids: [
                  '',
                ],
                type: 'string',
              },
            },
            type: 'object',
          },
          params: {
            children: {
              hello: {
                invalids: [
                  '',
                ],
                type: 'string',
              },
            },
            type: 'object',
          },
        },
        auth: {
          local: {
            userField: 'user',
            passwordField: 'password',
          },
          magicLink: {
            emailField: 'email',
          },
          magicCode: {
            emailField: 'email',
          },
        },
        out: {
          name: {
            invalids: [
              '',
            ],
            type: 'string',
            models: [String],
          },
          horses: {
            models: [String],
          },
          horses_id: {
            models: [String],
            description: 'A horse Id',
          },
          horses_ids: {
            models: [String],
            description: 'An array of horse Ids',
          },
          createdAt: {
            models: [Date],
            description: 'Creation date of resource',
          },
          updatedAt: {
            models: [Date],
            description: 'Date of latest update of resource',
          },
        },
        get: {},
        getId: {},
      },
      horses: {
        delete: {},
        get: {},
        getId: {},
        patch: {},
        put: {},
        out: {
          hello: {
            examples: [],
            models: ['string'],
            permissions: [],
            description: 'a field',
          },
        },
      },
      dragons: {
        get: {},
        getId: {},
        put: {},
        patch: {},
        delete: {},
      },

    },
  });
});

test('generate.swagger(superConfig)', () => {
  const r = swagger(superConfig);
  a.deepEqual(r, swaggerResult);
});
