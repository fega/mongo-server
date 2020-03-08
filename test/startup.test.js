/* eslint-env node, mocha */
const chai = require('chai');
const asPromised = require('chai-as-promised');
const proxyquire = require('proxyquire').noCallThru();
const connect = require('../lib/mongodb/connect');

const main = proxyquire('../startup', {
  '/config': {
    noListen: true,
    silent: true,
    seed: { posts: () => [{}] },
    resources: {
      users: {
        seed: [{}, {}],
      },
      pages: {
        seed: () => ({}),
      },
      robots: {

      },
    },
  },
});

chai.use(asPromised);

const a = chai.assert;

test('seed, db already filled', async () => {
  const [db] = await connect();
  await db.collection('hello').insert({});
  await main({
    silent: true,
    config: '/config',
  });
  const u = await db.collection('users').countDocuments();
  a.equal(u, 0);
});

test('seed, db empty', async () => {
  const [db] = await connect();
  await db.dropDatabase();
  await main({
    silent: true,
    config: '/config',
  });
  const u = await db.collection('users').countDocuments();
  const p = await db.collection('posts').countDocuments();
  const pa = await db.collection('pages').countDocuments();
  a.equal(p, 1);
  a.equal(pa, 1);
  a.equal(u, 2);
});
