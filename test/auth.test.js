/* eslint-env node, mocha */
const chai = require('chai');
const asPromised = require('chai-as-promised');
const request = require('supertest');
const { generate } = require('randomstring');
const jwt = require('jsonwebtoken');
const createServer = require('../server');
const mongo = require('../db');

chai.use(asPromised);

const a = chai.assert;
let db;

after(async () => {
  // await db.dropDatabase();
});

suite('local auth');
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
      users: { auth: { local: ['email', 'password', ['posts:read']] } },
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
  const u = await db.collection('users').findOne({ email });
  a.exists(u, 'resource was not created');
  a.notEqual(u.password, 'password');
  a.deepEqual(u.permissions, ['posts:read']);
});
test('POST /auth/:resource/log-in, user doesnt exists', async () => {
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
  a.equal(r.status, 401, 'Get /resources failing');
});
test('LOGIN FLOW', async () => {
  const s = createServer({
    resources: {
      users: { auth: { local: ['email', 'password', ['post:read']] } },
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
  a.equal(r1.body.email, email);
  a.equal(r1.body.password, undefined);
  a.exists(r1.body.$token);
  a.deepEqual(jwt.decode(r1.body.$token).permissions, ['post:read']);
  a.equal(r1.body.extraField, 'OK');
});
test('Should never leak the password');

suite('permssions');

test('GET POST PATCH PUT DELETE /:resources 401 UNATHORIZED, no user', async () => {
  const s = createServer({
    resources: {
      users: { auth: { local: ['email', 'password'] } },
      posts: {
        permissions: ['posts:read'],
      },
    },
  }, db);
  const r = await request(s).get('/posts');
  const r0 = await request(s).get('/posts/an-id');
  const r1 = await request(s).post('/posts');
  const r2 = await request(s).patch('/posts/an-id');
  const r3 = await request(s).put('/posts/an-id');
  const r4 = await request(s).delete('/posts/an-id');
  const r5 = await request(s).get('/users');
  a.equal(r.status, 401, 'Get /resources failing');
  a.equal(r0.status, 401, 'Get /resources/:id failing');
  a.equal(r1.status, 401, 'POST /resources failing');
  a.equal(r2.status, 401, 'Get /resources/:id failing');
  a.equal(r3.status, 401, 'Get /resources/:id failing');
  a.equal(r4.status, 401, 'Get /resources/:id failing');
  a.equal(r5.status, 200, 'Other endpoints are failing');
});

test('GET POST PATCH PUT DELETE /:resources 401 UNATHORIZED, Invalid JWT', async () => {
  const s = createServer({
    resources: {
      users: { auth: { local: ['email', 'password'] } },
      posts: {
        permissions: ['posts:read'],
      },
    },
  }, db);
  const token = await jwt.sign({ permissions: ['posts:read'] }, 'wrongSecret');
  const header = ['Authorization', `Bearer ${token}`];
  const r = await request(s).get('/posts').set(...header);
  const r0 = await request(s).get('/posts/an-id').set(...header);
  const r1 = await request(s).post('/posts').set(...header);
  const r2 = await request(s).patch('/posts/an-id').set(...header);
  const r3 = await request(s).put('/posts/an-id').set(...header);
  const r4 = await request(s).delete('/posts/an-id').set(...header);
  const r5 = await request(s).get('/users').set(...header);
  a.equal(r.status, 401, 'Get /resources failing');
  a.equal(r0.status, 401, 'Get /resources/:id failing');
  a.equal(r1.status, 401, 'POST /resources failing');
  a.equal(r2.status, 401, 'Get /resources/:id failing');
  a.equal(r3.status, 401, 'Get /resources/:id failing');
  a.equal(r4.status, 401, 'Get /resources/:id failing');
  a.equal(r5.status, 200, 'Other endpoints are failing');
});
test('GET POST PATCH PUT DELETE /:resources 403 FORBIDDEN, JWT without permissions', async () => {
  const s = createServer({
    resources: {
      users: { auth: { local: ['email', 'password'] } },
      posts: {
        permissions: ['posts:read'],
      },
    },
  }, db);
  const token = await jwt.sign({ permissions: ['random'] }, 'secret');
  const header = ['Authorization', `Bearer ${token}`];
  const r = await request(s).get('/posts').set(...header);
  const r0 = await request(s).get('/posts/an-id').set(...header);
  const r1 = await request(s).post('/posts').set(...header);
  const r2 = await request(s).patch('/posts/an-id').set(...header);
  const r3 = await request(s).put('/posts/an-id').set(...header);
  const r4 = await request(s).delete('/posts/an-id').set(...header);
  const r5 = await request(s).get('/users').set(...header);
  a.equal(r.status, 403, 'Get /resources failing');
  a.equal(r0.status, 403, 'Get /resources/:id failing');
  a.equal(r1.status, 403, 'POST /resources failing');
  a.equal(r2.status, 403, 'Get /resources/:id failing');
  a.equal(r3.status, 403, 'Get /resources/:id failing');
  a.equal(r4.status, 403, 'Get /resources/:id failing');
  a.equal(r5.status, 200, 'Other endpoints are failing');
});
test('GET POST PATCH PUT DELETE /:resources 200 OK', async () => {
  const s = createServer({
    resources: {
      users: { auth: { local: ['email', 'password'] } },
      posts: {
        patch: { permissions: ['post:write'] },
        put: { permissions: ['post:write'] },
        permissions: ['posts:read'],
      },
      restrict: true,
    },
  }, db);
  const token = await jwt.sign({ permissions: ['posts:read'] }, 'secret');
  const header = ['Authorization', `Bearer ${token}`];
  const r = await request(s).get('/posts').set(...header);
  const r0 = await request(s).get('/posts/an-id').set(...header);
  const r1 = await request(s).post('/posts').set(...header);
  const r2 = await request(s).patch('/posts/an-id').set(...header);
  const r3 = await request(s).put('/posts/an-id').set(...header);
  const r4 = await request(s).delete('/posts/an-id').set(...header);
  const r5 = await request(s).get('/users').set(...header);
  a.equal(r.status, 200, 'Get /resources failing');
  a.equal(r0.status, 404, 'Get /resources/:id failing');
  a.equal(r1.status, 200, 'POST /resources failing');
  a.equal(r2.status, 403, 'PATCH /resources/:id failing');
  a.equal(r3.status, 403, 'PUT /resources/:id failing');
  a.equal(r4.status, 404, 'DELETE /resources/:id failing');
  a.equal(r5.status, 200, 'Other endpoints are failing');
});
