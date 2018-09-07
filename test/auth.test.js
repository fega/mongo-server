/* eslint-env node, mocha */
const chai = require('chai');
const asPromised = require('chai-as-promised');
const request = require('supertest');
const { generate } = require('randomstring');
const createServer = require('../server');
const mongo = require('../db');

chai.use(asPromised);

const a = chai.assert;
let db;

after(async () => {
  // await db.dropDatabase();
});

suite.only('local auth');
before(async () => {
  db = await mongo();
});
test("POST /auth/:resource/sign-up, resource doesn't have login", async () => {
  const s = createServer({
    resources: {
      users: {},
    },
  }, db);
  const r = await request(s).post('/auth/users/sign-up');
  a.equal(r.status, 404);
});
test('POST /auth/:resource/sign-up,missing body fields', async () => {
  const s = createServer({
    resources: {
      users: { auth: { local: ['email', 'password'] } },
      posts: {},
    },
  }, db);
  const r = await request(s).post('/auth/users/sign-up');
  a.equal(r.status, 400);
});
test('POST /auth/:resource/sign-up, resource already exists login', async () => {
  const s = createServer({
    resources: {
      users: { auth: { local: ['email', 'password'] } },
      posts: {},
    },
  }, db);
  await request(s).post('/users').send({ email: 'fega@mail.com' });
  const r = await request(s)
    .post('/auth/users/sign-up')
    .send({
      email: 'fega@mail.com',
      password: 'password',
    });
  a.equal(r.status, 403);
});
test('POST /auth/:resource/sign-up, resource have login', async () => {
  const s = createServer({
    resources: {
      users: { auth: { local: ['email', 'password'] } },
      posts: {},
    },
  }, db);
  const email = `${generate()}@mail.com`;
  const r = await request(s)
    .post('/auth/users/sign-up')
    .send({
      email,
      password: 'password',
      extraField: 'OK',
    });
  a.equal(r.status, 200);
  a.isString(r.body.$token);
  const u = await db.collection('users').findOne({ email: `${generate()}@mail.com` });
  a.exists(u, 'resource was not created');
  a.match(u.password, 'resource doesnt have password');
});
test.only('POST /auth/:resource/log-in, user doesnt exists', async () => {
  const s = createServer({
    resources: {
      users: { auth: { local: ['email', 'password'] } },
      posts: {},
    },
  }, db);
  const email = `${generate()}@mail.com`;
  const r = await request(s)
    .post('/auth/users/log-in')
    .send({
      email,
      password: 'password',
      extraField: 'OK',
    });
  a.equal(r.status, 401);
});
test.only('LOGIN FLOW', async () => {
  const s = createServer({
    resources: {
      users: { auth: { local: ['email', 'password'] } },
      posts: {},
    },
  }, db);
  const email = `${generate()}@mail.com`;
  const r = await request(s)
    .post('/auth/users/sign-up')
    .send({
      email,
      password: 'password',
      extraField: 'OK',
    });
  const r1 = await request(s)
    .post('/auth/users/log-in')
    .send({
      email,
      password: 'password',
    });
  a.equal(r.status, 200);
  a.equal(r1.status, 200);
  console.log(r.body);
  a.equal(r1.body.email, email);
  a.equal(r1.body.password, undefined);
  a.exists(r1.body.$token);
  a.equal(r1.body.extraField, 'OK');
});
test('Should never leak the password');
