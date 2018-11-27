/* eslint-env node, mocha */
const chai = require('chai');

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
        out: (resource, user) => ({
          name: resource.name,
        }),
        get: {},
        getId: {},
        notHelpful: {},
      },
      cats: false,
    },
  }), {
    resources: {
      dogs: {
        out: {
          name: { type: 'string' },
        },
        get: {},
        getId: {},
      },

    },
  });
});
