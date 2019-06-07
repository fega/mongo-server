/* eslint-env node, mocha */
const chai = require('chai');
const Joi = require('joi');
const { give, Image } = require('loy');
const { describeServer: ds } = require('../swagger/util');
const { swagger } = require('../swagger/generator');
const swaggerResult = require('./swagger.super.json');
const describeServer = require('./describe.super');

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
        hello: give(resource.hello).as('number').description('a field').ok(),
      }),
      getId: true,
    },
    mares: {
      out: resource => ({
        hello: resource.number,
        number: give(resource.number).as('number').ok(),
        image: give(resource.number).format(Image).ok(),
      }),
      in: {
        body: {
          hello: Joi.number(),
        },
      },
      getId: false,
      get: false,
      put: false,
      delete: false,
      post: false,
    },
    dragons: true,
  },
};


suite('describeServer()');
test('describeServer({})', () => {
  a.deepEqual(ds({}), {});
});
test.skip('string type bug', () => {
  a.deepEqual(ds({
    resources: {
      mares: {
        out: resource => ({
          hello: resource.number,
          number: give(resource.number).ok(),
          image: give(resource.number).as(Image).ok(),
        }),
        in: {
          body: {
            hello: Joi.number(),
          },
        },
        getId: false,
        get: false,
        put: false,
        delete: false,
        post: false,
      },
    },
  }), {
    resources: {
      mares: {
        patch: {},
        out: {
          hello: {
            type: 'number',
            flags: {
              unsafe: false,
            },
            invalids: [
              Infinity,
              -Infinity,
            ],
          },
          number: {
            type: 'number',
          },
          image: {
            type: 'loi_internal_Image',
          },
        },
        in: {
          body: {
            type: 'object',
            children: {
              hello: {
                type: 'number',
                flags: {
                  unsafe: false,
                },
                invalids: [
                  Infinity,
                  -Infinity,
                ],
              },
            },
          },
        },
      },
    },
  });
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

test('describeServer(AdminPanel)', () => {
  a.deepEqual(ds({
    resources: {
      dogs: {
        admin: {
          top: [{
            name: 'hello',
            size: [3, 1],
          }],
        },
      },
    },
  }), {
    resources: {
      dogs: {
        get: {},
        getId: {},
        delete: {},
        put: {},
        patch: {},
        admin: {
          top: [{
            name: 'hello',
            size: [3, 1],
          }],
        },
      },
    },
  });
});

test.skip('describeServer(superConfig)', () => {
  a.deepEqual(ds(superConfig), describeServer);
});

test.skip('generate.swagger(superConfig)', () => {
  const r = swagger(superConfig);
  a.deepEqual(r, swaggerResult);
});
