/* eslint-env node, mocha */
const chai = require('chai');
const { give } = require('loy');
const { describeServer: ds } = require('../swagger/util');

const a = chai.assert;


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
test('describeServer({resources:{dogs:{endpoints}}})', () => {
  a.deepEqual(ds({
    resources: {
      dogs: {
        out: resource => ({
          name: resource.name,
          horses: resource.horses,
          horses_id: resource.horses_id,
          horses_ids: resource.horses_id,
          created_at: resource.created_at,
          updatedAt: resource.updatedAt,
        }),
        get: {},
        getId: {},
        notHelpful: {},
      },
      cats: false,
      horses: {
        out: resource => ({
          hello: give(resource.hello).as('string').description('a field').ok(),
        }),
      },
    },
  }), {
    resources: {
      dogs: {
        out: {
          name: { models: [String] },
          horses: {
            models: [['horses']],
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
            description: 'Horse date of creation',
          },
          updatedAt: {
            models: [Date],
            description: 'Horse date of latest update',
          },
        },
        get: {},
        getId: {},
      },
      horses: {
        out: {
          hello: {
            examples: [],
            models: ['string'],
            permissions: [],
            description: 'a field',
          },
        },
      },
    },
  });
});
