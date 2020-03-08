/* eslint-env node, mocha */
const chai = require('chai');
const asPromised = require('chai-as-promised');
const request = require('supertest');
const { generate } = require('randomstring');
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const date = require('date.js');
const createServer = require('../server');
const mongo = require('../lib/mongodb/connect');

const rand = (length, current) => {
  const _current = current || '';
  return length ? rand(--length, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'.charAt(Math.floor(Math.random() * 60)) + _current) : _current;
};

chai.use(asPromised);

const a = chai.assert;
let db;

after(async () => {
  // await db.dropDatabase();
});
before(async () => {
  ([db] = await mongo());
});

suite('local auth');

test("POST /auth/:resource/sign-up, resource doesn't have login", async () => {
  const s = createServer({
    silent: true,
    resources: {
      users: {},
    },
  }, db);
  const r = await request(s).post('/auth/users/sign-up');
  a.equal(r.status, 404);
});
test('POST /auth/:resource/sign-up,missing body fields', async () => {
  const s = createServer({
    silent: true,
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
    silent: true,
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
    silent: true,
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
    silent: true,
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
    silent: true,
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

suite('magic link auth');
test("POST /auth/:resource/magic-link, resource doesn't have magic links", async () => {
  const s = createServer({
    silent: true,
    resources: {
      users: {},
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
  const r = await request(s).post('/auth/users/magic-link');
  a.equal(r.status, 404);
});
test('POST /auth/:resource/magic-link, missing body fields', async () => {
  const s = createServer({
    silent: true,
    resources: {
      users: { auth: { magicLink: {} } },
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
  const r = await request(s).post('/auth/users/magic-link');
  a.equal(r.status, 400);
});
test('POST /auth/:resource/magic-link, invalid email', async () => {
  const s = createServer({
    silent: true,
    resources: {
      users: { auth: { magicLink: {} } },
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
  const r = await request(s)
    .post('/auth/users/magic-link')
    .send({
      email: 'fega.blablabla',
    });
  a.equal(r.status, 400);
});
test('POST /auth/:resource/magic-link, maxAmount of tokens', async () => {
  const email = `${ObjectId()}@gmail.com`;
  const exp = date('in 10 days');
  await db.collection('moser-magic-links').insertOne({ email, exp });
  await db.collection('moser-magic-links').insertOne({ email, exp });
  await db.collection('moser-magic-links').insertOne({ email, exp });
  const s = createServer({
    silent: true,
    resources: {
      users: { auth: { magicLink: {} } },
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
  const r = await request(s)
    .post('/auth/users/magic-link')
    .send({
      email,
    });
  a.equal(r.status, 429);
});
test('POST /auth/:resource/magic-link, OK', async () => {
  const email = `${ObjectId()}@gmail.com`;
  const s = createServer({
    silent: true,
    resources: {
      users: { auth: { magicLink: {} } },
    },
    nodemailer: {
      service: 'MailDev',
    },
    host: 'localhost:3000',
    root: '/',
  }, db);
  const r = await request(s)
    .post('/auth/users/magic-link')
    .send({
      email,
    });
  a.equal(r.status, 200);
});
test('POST /auth/:resource/magic-link, OK, SEnd JWT', async () => {
  const email = `${ObjectId()}@gmail.com`;
  const s = createServer({
    silent: true,
    resources: {
      users: { auth: { magicLink: {sendJwt:true} } },
    },
    nodemailer: {
      service: 'MailDev',
    },
    host: 'localhost:3000',
    root: '/',
    jwtSecret: 'secret',

  }, db);
  const r = await request(s)
    .post('/auth/users/magic-link')
    .send({
      email,
    });

  console.log(r.body)
  a.equal(r.status, 200, r.body);
  a.equal(!!r.body._id, true, 'NO ID IN RESPONSE');
  a.equal(!!r.body.$token, true, 'NO TOKEN IN RESPONSE');
});

test("GET /auth/:resource/magic-link/:token, resource doesn't have magic links", async () => {
  const s = createServer({
    silent: true,
    resources: {
      users: {},
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
  const r = await request(s).get('/auth/users/magic-link/token');
  a.equal(r.status, 404);
});
test('GET /auth/:resource/magic-link/:token, BAD_REQUEST wrong token', async () => {
  const s = createServer({
    silent: true,
    resources: {
      users: { auth: { magicLink: {} } },
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
  const r = await request(s).get('/auth/users/magic-link/an-id');
  a.equal(r.status, 400);
  a.equal(r.body.message, 'Wrong Token');
});
test('GET /auth/:resource/magic-link/:token, NOT_FOUND, token not found', async () => {
  const s = createServer({
    silent: true,
    resources: {
      users: { auth: { magicLink: {} } },
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
  const r = await request(s).get(`/auth/users/magic-link/${rand(74)}`);
  a.equal(r.status, 404);
  a.equal(r.body.message, 'Token not found');
});
test('GET /auth/:resource/magic-link/:token, BAD_REQUEST, expired token', async () => {
  const token = rand(74);
  await db.collection('moser-magic-links').insertOne({ token, exp: date('in two days'), status: 'VERIFIED' });

  const s = createServer({
    silent: true,
    resources: {
      users: { auth: { magicLink: {} } },
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
  const r = await request(s).get(`/auth/users/magic-link/${token}`);
  a.equal(r.status, 400);
  a.equal(r.body.message, 'Token already used');
});
test('GET /auth/:resource/magic-link/:token, BAD_REQUEST, user not found', async () => {
  const token = rand(74);
  await db.collection('moser-magic-links').insertOne({ email: 'jump', token, exp: date('in two days') });

  const s = createServer({
    silent: true,
    resources: {
      users: { auth: { magicLink: {} } },
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
  const r = await request(s).get(`/auth/users/magic-link/${token}`);
  a.equal(r.status, 400);
  a.equal(r.body.message, 'User is not on db anymore');
});
test('GET /auth/:resource/magic-link/:token, OK', async () => {
  const token = rand(74);
  const email = `${ObjectId()}@gmail.com`;
  const user = { _id: ObjectId().toString(), email };
  await db.collection('moser-magic-links').insertOne({ token, exp: date('in two days'), email });
  await db.collection('users').insertOne(user);
  const s = createServer({
    silent: true,
    resources: {
      users: { auth: { magicLink: {} } },
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
  const r = await request(s).get(`/auth/users/magic-link/${token}`);
  a.equal(r.status, 200);
  const u = await db.collection('users').findOne({ _id: user._id });
  const t = await db.collection('moser-magic-links').findOne({ token });
  a.isTrue(u.permissions.includes('email:verified'), 'Permission not added to user');
  a.equal(t.status, 'VERIFIED', 'Status no added to token');
});

test('GET /auth/:resource/magic-token/:searchToken, resource doesnt have magic links', async () => {
  const s = createServer({
    silent: true,
    resources: {
      users: {},
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
  const r = await request(s).get('/auth/users/magic-token/a search token');
  a.equal(r.status, 404);
});
test('GET /auth/:resource/magic-token/:searchToken, invalid token', async () => {
  const token = rand(74);
  const s = createServer({
    silent: true,
    resources: {
      users: { auth: { magicLink: {} } },
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
  const r = await request(s).get('/auth/users/magic-token/a search token');
  a.equal(r.status, 400);
  a.equal(r.body.message, 'Wrong Token');
});
test('GET /auth/:resource/magic-token/:searchToken, token not found', async () => {
  const token = rand(74);

  const s = createServer({
    silent: true,
    resources: {
      users: { auth: { magicLink: {} } },
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
  const r = await request(s).get(`/auth/users/magic-token/${token}`);
  a.equal(r.status, 404);
  a.equal(r.body.message, 'Token not found');
});
test('GET /auth/:resource/magic-token/:searchToken, token expired', async () => {
  const token = rand(74);
  await db.collection('moser-magic-links').insertOne({ search: token, exp: date('two days ago'), status: 'VERIFIED' });

  const s = createServer({
    silent: true,
    resources: {
      users: { auth: { magicLink: {} } },
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
  const r = await request(s).get(`/auth/users/magic-token/${token}`);
  a.equal(r.status, 400);
  a.equal(r.body.message, 'Token expired');
});
test('GET /auth/:resource/magic-token/:searchToken, token not verified', async () => {
  const token = rand(74);
  await db.collection('moser-magic-links').insertOne({ search: token, exp: date('in two days') });

  const s = createServer({
    silent: true,
    resources: {
      users: { auth: { magicLink: {} } },
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
  const r = await request(s).get(`/auth/users/magic-token/${token}`);
  a.equal(r.status, 400);
  a.equal(r.body.message, 'Token not verified');
});
test('GET /auth/:resource/magic-token/:searchToken, token already retrieved', async () => {
  const token = rand(74);
  await db.collection('moser-magic-links').insertOne({ search: token, exp: date('in two days'), status: 'RETRIEVED' });

  const s = createServer({
    silent: true,
    resources: {
      users: { auth: { magicLink: {} } },
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
  const r = await request(s).get(`/auth/users/magic-token/${token}`);
  a.equal(r.status, 400);
  a.equal(r.body.message, 'Token already used');
});
test('GET /auth/:resource/magic-token/:searchToken, user not in db', async () => {
  const token = rand(74);
  await db.collection('moser-magic-links').insertOne({
    email: 'jump',
    search: token,
    exp: date('in two days'),
    status: 'VERIFIED',
  });

  const s = createServer({
    silent: true,
    resources: {
      users: { auth: { magicLink: {} } },
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
  const r = await request(s).get(`/auth/users/magic-token/${token}`);
  a.equal(r.status, 400);
  a.equal(r.body.message, 'User is not on db anymore');
});
test('GET /auth/:resource/magic-token/:searchToken, OK', async () => {
  const token = rand(74);
  const email = `${ObjectId()}@gmail.com`;
  await db.collection('moser-magic-links').insertOne({
    search: token, exp: date('in two days'), status: 'VERIFIED', email,
  });
  const user = { _id: ObjectId().toString(), email };
  await db.collection('users').insertOne(user);

  const s = createServer({
    silent: true,
    resources: {
      users: { auth: { magicLink: {} } },
    },
    nodemailer: {
      service: 'MailDev',
    },
    jwtSecret: 'secret',
    restrict: true,
  }, db);
  const r = await request(s).get(`/auth/users/magic-token/${token}`);

  const t = await db.collection('moser-magic-links').findOne({ search: token });
  a.equal(t.status, 'RETRIEVED', 'Status no added to token');

  a.equal(r.status, 200);
  a.exists(r.body.$token);
});

/**
 * MAGIC CODE
 */
suite('magic CODE auth');
test("POST /auth/:resource/magic-link, resource doesn't have magic links", async () => {
  const s = createServer({
    silent: true,
    resources: {
      users: {},
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
  const r = await request(s).post('/auth/users/magic-code');
  a.equal(r.status, 404);
});
test('POST /auth/:resource/magic-link, missing body fields', async () => {
  const s = createServer({
    silent: true,
    resources: {
      users: { auth: { magicCode: {} } },
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
  const r = await request(s).post('/auth/users/magic-code');
  a.equal(r.status, 400);
});
test('POST /auth/:resource/magic-code, invalid email', async () => {
  const s = createServer({
    silent: true,
    resources: {
      users: { auth: { magicCode: {} } },
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
  const r = await request(s)
    .post('/auth/users/magic-code')
    .send({
      email: 'fega.blablabla',
    });
  a.equal(r.status, 400);
});
test('POST /auth/:resource/magic-code, maxAmount of tokens', async () => {
  const email = `${ObjectId()}@gmail.com`;
  const exp = date('in 10 days');
  await db.collection('moser-magic-codes').insertOne({ email, exp });
  await db.collection('moser-magic-codes').insertOne({ email, exp });
  await db.collection('moser-magic-codes').insertOne({ email, exp });
  const s = createServer({
    silent: true,
    resources: {
      users: { auth: { magicCode: {} } },
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
  const r = await request(s)
    .post('/auth/users/magic-code')
    .send({
      email,
    });
  a.equal(r.status, 429);
});
test('POST /auth/:resource/magic-code, OK', async () => {
  const email = `${ObjectId()}@gmail.com`;
  const s = createServer({
    silent: true,
    resources: {
      users: {
        auth: {
          magicCode: {
            default: user => ({ ...user, $timestamps: true }),
          },
        },
      },
    },
    nodemailer: {
      service: 'MailDev',
    },
    host: 'localhost:3000',
    root: '/',
  }, db);
  const r = await request(s)
    .post('/auth/users/magic-code')
    .send({
      email,
    });
  a.equal(r.status, 200);
  a.isTrue(r.body.userCreated);
  const u = await db.collection('users').findOne({ email });
  const t = await db.collection('moser-magic-codes').findOne({ email });
  a.exists(u, 'user not created or found');
  a.exists(u.createdAt, 'Default function not executed');
  a.exists(t, 'token not created');
  a.exists(t.token, 'token not created');
});

test("GET /auth/:resource/magic-code/:token, resource doesn't have magic links", async () => {
  const s = createServer({
    silent: true,
    resources: {
      users: {},
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
  const r = await request(s).get('/auth/users/magic-code/email/token');
  a.equal(r.status, 404);
});
test('GET /auth/:resource/magic-code/:token, NOT_FOUND, token not found', async () => {
  const s = createServer({
    silent: true,
    resources: {
      users: { auth: { magicCode: {} } },
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
  const r = await request(s).get(`/auth/users/magic-code/email/${rand(4)}`);
  a.equal(r.status, 404);
  a.equal(r.body.message, 'Token not found');
});
test('GET /auth/:resource/magic-code/:token, BAD_REQUEST, expired token', async () => {
  const token = rand(74);
  await db.collection('moser-magic-codes').insertOne({
    token, exp: date('in two days'), status: 'VERIFIED', email: 'email',
  });

  const s = createServer({
    silent: true,
    resources: {
      users: { auth: { magicCode: {} } },
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
  const r = await request(s).get(`/auth/users/magic-code/email/${token}`);
  a.equal(r.status, 400);
  a.equal(r.body.message, 'Token already used');
});
test('GET /auth/:resource/magic-code/:token, BAD_REQUEST, user not found', async () => {
  const token = rand(74);
  await db.collection('moser-magic-codes').insertOne({ email: 'jump', token, exp: date('in two days') });

  const s = createServer({
    silent: true,
    resources: {
      users: { auth: { magicCode: {} } },
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
  const r = await request(s).get(`/auth/users/magic-code/jump/${token}`);
  a.equal(r.status, 400);
  a.equal(r.body.message, 'User is not on db anymore');
});
test('GET /auth/:resource/magic-code/email/:token, OK', async () => {
  const token = rand(74);
  const email = `${ObjectId()}@gmail.com`;
  const user = { _id: ObjectId().toString(), email };
  await db.collection('moser-magic-codes').insertOne({ token, exp: date('in two days'), email });
  await db.collection('users').insertOne(user);
  const s = createServer({
    silent: true,
    resources: {
      users: { auth: { magicCode: {} } },
    },
    nodemailer: {
      service: 'MailDev',
    },
    jwtSecret: 'secret',
  }, db);
  const r = await request(s).get(`/auth/users/magic-code/${email}/${token}`);
  a.equal(r.status, 200);
  a.exists(r.body.state);
  a.exists(r.body.$token);
  const u = await db.collection('users').findOne({ _id: user._id });
  const t = await db.collection('moser-magic-codes').findOne({ token });
  a.isTrue(u.permissions.includes('email:verified'), 'Permission not added to user');
  // a.equal(t.status, 'VERIFIED', 'Status no added to token');
});


suite('facebook auth');

test('GET /auth/:resource/facebook, resource doesnt have facebook auth', async () => {
  const s = createServer({
    silent: true,
    resources: {
      users: {},
    },
  }, db);
  const r = await request(s).get('/auth/users/facebook');
  a.equal(r.status, 404);
});
test('GET /auth/:resource/facebook, resource doesnt have facebook auth', async () => {
  const s = createServer({
    silent: true,
    resources: {
      users: {},
    },
  }, db);
  const r = await request(s).get('/auth/users/facebook');
  a.equal(r.status, 404);
});

suite('Permissions');

test('GET POST PATCH PUT DELETE /:resources 401 UNAUTHORIZED, no user', async () => {
  const s = createServer({
    silent: true,
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
test('GET POST PATCH PUT DELETE /:resources 200, empty permissions array', async () => {
  const s = createServer({
    silent: true,
    resources: {
      users: { auth: { local: ['email', 'password'] } },
      posts: {
        permissions: [],
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
  a.equal(r.status, 200, 'Get /resources failing');
  a.equal(r0.status, 404, 'Get /resources/:id failing');
  a.equal(r1.status, 200, 'POST /resources failing');
  a.equal(r2.status, 400, 'PATCH /resources/:id failing');
  a.equal(r3.status, 404, 'PUT /resources/:id failing');
  a.equal(r4.status, 404, 'DELETE /resources/:id failing');
  a.equal(r5.status, 200, 'Other endpoints are failing');
});
test('GET POST PATCH PUT DELETE /:resources 401 UNAUTHORIZED, Invalid JWT', async () => {
  const s = createServer({
    silent: true,
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
    silent: true,
    resources: {
      users: { auth: { local: ['email', 'password'] } },
      posts: {
        permissions: ['posts:read'],
      },
    },
  }, db);
  const token = await jwt.sign({ permissions: ['random'], resource: 'users' }, 'secret');
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
test('GET POST PATCH PUT DELETE /:resources dynamic permissions', async () => {
  const userId = ObjectId().toString();
  const postId = ObjectId().toString();
  const { ops: [post] } = await db.collection('posts').insertOne({ author: 'fabian', user_id: userId, _id: postId });
  await db.collection('posts').insertOne({ author: 'fabian', user_id: userId });
  await db.collection('posts').insertOne({ author: 'fabian', user_id: userId });
  await db.collection('posts').insertOne({ author: 'fabian', user_id: 1 });
  await db.collection('posts').insertOne({ author: 'fabian', user_id: 2 });
  const { ops: [user] } = await db.collection('posts').insertOne({ author: 'fabian', _id: userId });
  const token = await jwt.sign({ permissions: ['posts:read'], _id: userId, resource: 'users' }, 'secret');
  const header = ['Authorization', `Bearer ${token}`];
  const s = createServer({
    silent: true,
    resources: {
      posts: {
        permissions: ['$custom', '$filter'],
      },
    },
    permissions: {
      $custom: ({ user: u }) => user._id === u._id,
    },
    filters: {
      $filter: ({ user: u }) => ({ user_id: u._id }),
    },
  }, db);
  // this should pass
  const r = await request(s).get('/posts').set(...header);
  const r0 = await request(s).get(`/posts/${postId}`).set(...header);
  const r1 = await request(s).post('/posts').set(...header);
  const r2 = await request(s).patch(`/posts/${postId}`).set(...header).send({ hello: 'hello' });
  const r3 = await request(s).put(`/posts/${postId}`).set(...header);
  const r4 = await request(s).delete(`/posts/${postId}`).set(...header);
  a.equal(r.status, 200, 'Get /resources failing');
  a.equal(r.body.length, 3, 'Get /resources is having a problem with a filter');
  a.equal(r0.status, 200, 'Get /resources/:id failing');
  a.equal(r1.status, 200, 'POST /resources failing');
  a.equal(r2.status, 200, 'PATCH /resources/:id failing');
  a.equal(r3.status, 200, 'PUT /resources/:id failing');
  a.equal(r4.status, 204, 'DELETE /resources/:id failing');


  const token2 = await jwt.sign({ permissions: ['posts:read'], _id: 2, resource: 'users' }, 'secret');
  const header2 = ['Authorization', `Bearer ${token2}`];
  const { ops: [post2] } = await db.collection('posts').insertOne({ author: 'fabian', _id: ObjectId().toString() });

  // this should not pass
  const d = await request(s).get('/posts').set(...header2);
  const d0 = await request(s).get(`/posts/${post2._id}`).set(...header2);
  const d1 = await request(s).post('/posts').set(...header2);
  const d2 = await request(s).patch(`/posts/${post2._id}`).set(...header2).send({ hello: 'hello' });
  const d3 = await request(s).put(`/posts/${post2._id}`).set(...header2);
  const d4 = await request(s).delete(`/posts/${post2._id}`).set(...header2);
  a.equal(d.status, 403, 'Get /resources failing');
  a.equal(d0.status, 403, 'Get /resources/:id failing');
  a.equal(d1.status, 403, 'POST /resources failing');
  a.equal(d2.status, 403, 'PATCH /resources/:id failing');
  a.equal(d3.status, 403, 'PUT /resources/:id failing');
  a.equal(d4.status, 403, 'DELETE /resources/:id failing');
});
test('GET /:resources, only one special permission', async () => {

});
test('GET POST PATCH PUT DELETE /:resources 200 OK', async () => {
  const s = createServer({
    silent: true,
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
  const token = await jwt.sign({ permissions: ['posts:read'], resource: 'users' }, 'secret');
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


suite('IN validation');
test('validation OK', async () => {
  const s = createServer({
    silent: true,
    resources: {
      posts: {
        patch: {
          in: {
            body: {
              version: Joi.number().required(),
            },
          },
        },
        in: {
          body: {
            title: Joi.string().required(),
            content: Joi.string().required(),
          },
        },
      },
    },
  }, db);
  const token = await jwt.sign({ permissions: ['posts:read'] }, 'secret');
  const header = ['Authorization', `Bearer ${token}`];

  const r = await request(s).get('/posts').set(...header);
  const r0 = await request(s).get('/posts/an-id').set(...header);
  const r1 = await request(s).post('/posts').set(...header);
  const r2 = await request(s).patch('/posts/an-id').set(...header);
  const r3 = await request(s).put('/posts/an-id').set(...header);

  a.equal(r.status, 200, 'GET /resources failing');
  a.equal(r0.status, 404, 'GET /resources/:id failing');
  a.equal(r1.status, 400, 'POST /resources failing');
  a.equal(r2.status, 400, 'PATCH /resources failing');
  a.equal(r3.status, 400, 'PUT /resources failing');

  const rValid1 = await request(s).post('/posts').set(...header).send({ title: 'hey', content: 'hey' });
  const rValid2 = await request(s).patch('/posts/an-id').set(...header).send({ title: 'hey', content: 'hey', version: 1 });
  a.equal(rValid1.status, 200, 'POST /resources valid request failing');
  a.equal(rValid2.status, 404, 'POST /resources valid request failing');
});
suite('OUT validation');
test('validation OK', async () => {
  const s = createServer({
    silent: true,
    resources: {
      posts: {
        patch: {
        },
        out: resource => ({
          id: resource._id,
          extra: 'extra',
        }),
      },
    },
  }, db);
  const token = await jwt.sign({ permissions: ['posts:read'] }, 'secret');
  const header = ['Authorization', `Bearer ${token}`];

  const r0 = await request(s).post('/posts').set(...header);
  const r1 = await request(s).get(`/posts/${r0.body.id}`).set(...header);
  a.equal(r1.status, 200);
  a.exists(r1.body.id);
  a.equal(r1.body.extra, 'extra');
});
test('validation for nested resources', async () => {

});
