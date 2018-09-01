/* eslint-env node, mocha */
const chai = require('chai');
const request = require('supertest');
const createServer = require('../server');
const mongo = require('../db');

const a = chai.assert;
let db;
let server;
let serverEmpty;

after(async () => {
  await db.dropDatabase();
});

suite.only('configuration');
before(async () => {
  db = await mongo();
  console.log('before');
  serverEmpty = await createServer({}, db);
  server = await createServer({
    port: 3000,
    noListen: true,
    compress: {},
    helmet: {},
    cors: { origin: true },
    staticRoot: '/static',
  }, db);
});
test('have CORS enabled', () => {
  console.log('before');
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
suite('port and host');
