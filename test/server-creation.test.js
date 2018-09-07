/* eslint-env node, mocha */
const chai = require('chai');
const asPromised = require('chai-as-promised');
const request = require('supertest');
const createServer = require('../server');
const mongo = require('../db');

chai.use(asPromised);

const a = chai.assert;
let db;
let server;
let serverEmpty;

after(async () => {
  // await db.dropDatabase();
});

suite('configuration');
before(async () => {
  db = await mongo();
  serverEmpty = await createServer({}, db);
  function personalizedMiddleware(req, res, next) {
    next();
  }
  server = await createServer({
    port: 3000,
    noListen: true,
    compress: {},
    helmet: {},
    cors: { origin: true },
    staticRoot: '/static',
    middleware: [personalizedMiddleware],
  }, db);
});
test('have CORS enabled', () => {
  const cors = server._router.stack.find(m => m.name === 'corsMiddleware');
  a.exists(cors);
});
test('have no CORS', () => {
  const cors = serverEmpty._router.stack.find(m => m.name === 'corsMiddleware');
  a.notExists(cors);
});
test('have compression', () => {
  const cors = server._router.stack.find(m => m.name === 'compression');
  a.exists(cors);
});
test('have NO compression', () => {
  const cors = serverEmpty._router.stack.find(m => m.name === 'compression');
  a.notExists(cors);
});
test('have helmet', () => {
  const cors = server._router.stack.find(m => m.name === 'helmet');
  a.exists(cors);
});
test('have NO helmet', () => {
  const cors = serverEmpty._router.stack.find(m => m.name === 'helmet');
  a.notExists(cors);
});
test('have serveStatic non default url', () => {
  const cors = server._router.stack.find(m => m.name === 'serveStatic');
  a.exists(cors);
  a.deepEqual(cors.regexp, /^\/static\/?(?=\/|$)/i);
});
test('have default serveStatic', () => {
  const cors = serverEmpty._router.stack.find(m => m.name === 'serveStatic');
  a.exists(cors);
  a.deepEqual(cors.regexp, /^\/?(?=\/|$)/i);
});
test('Have personalized Middleware', () => {
  const cors = server._router.stack.find(m => m.name === 'personalizedMiddleware');
  a.exists(cors);
  a.deepEqual(cors.regexp, /^\/?(?=\/|$)/i);
});
test('Restrict Option Error', async () => {
  a.throws(() => {
    createServer({
      noListen: true,
      restrict: true,
    });
  });
});
test('Restrict Option', async () => {
  const restrictedServer = await createServer({
    noListen: true,
    restrict: true,
    resources: {
      dogs: true,
      cats: false,
    },
  }, db);
  const r = await request(restrictedServer).get('/dogs');
  const r1 = await request(restrictedServer).get('/cats');
  const r2 = await request(restrictedServer).get('/users');
  a.equal(r.status, 200);
  a.equal(r1.status, 404);
  a.equal(r2.status, 404);
});
