/* eslint-env node, mocha */
const chai = require('chai');
const request = require('supertest');
const MailDev = require('maildev');
const delay = require('delay');
const asPromised = require('chai-as-promised');
const createServer = require('../server');
const mongo = require('../db');

chai.use(asPromised);

const maildev = new MailDev();
maildev.listen();

const a = chai.assert;
let db;
let server;
before(async () => {
  db = await mongo();
  server = await createServer({ port: 3000, noListen: true }, db);
});
after(async () => {
  await db.dropDatabase();
});
/**
 * GET /resources endpoint
 */
suite('GET /:resource');

test('OK', async () => {
  await db.collection('posts').insertOne({ title: 'a title' });
  const r = await request(server).get('/posts').expect(200);
  a.equal(r.body[0].title, 'a title');
});

test('filters, OK', async () => {
  await db.collection('comments').insertOne({ author: 'fabian' });
  await db.collection('comments').insertOne({ author: 'fabian' });
  await db.collection('comments').insertOne({ author: 'tata' });
  await db.collection('comments').insertOne({ author: 'tata' });
  const r = await request(server).get('/comments?author=tata').expect(200);
  a.equal(r.body.length, 2);
});
test('filters, BAD_REQUEST unsafe filters', async () => {
  const r = await request(server).get('/comments?$author=tata').expect(400);
});

test('?$limit, OK', async () => {
  await db.collection('pets').insertOne({ name: 'Puky' });
  await db.collection('pets').insertOne({ name: 'Puky' });
  await db.collection('pets').insertOne({ name: 'Puky' });
  await db.collection('pets').insertOne({ name: 'Puky' });
  await db.collection('pets').insertOne({ name: 'Puky' });
  const r = await request(server).get('/pets?$limit=3').expect(200);
  a.equal(r.body.length, 3);
});
test('?$limit, invalid', async () => {
  await db.collection('pots').insertOne({ name: 'Puky' });
  await db.collection('pots').insertOne({ name: 'Puky' });
  await db.collection('pots').insertOne({ name: 'Puky' });
  await db.collection('pots').insertOne({ name: 'Puky' });
  await db.collection('pots').insertOne({ name: 'Puky' });
  await db.collection('pots').insertOne({ name: 'Puky' });
  await db.collection('pots').insertOne({ name: 'Puky' });
  await db.collection('pots').insertOne({ name: 'Puky' });
  await db.collection('pots').insertOne({ name: 'Puky' });
  await db.collection('pots').insertOne({ name: 'Puky' });
  await db.collection('pots').insertOne({ name: 'Puky' });
  await db.collection('pots').insertOne({ name: 'Puky' });
  await db.collection('pots').insertOne({ name: 'Puky' });
  await db.collection('pots').insertOne({ name: 'Puky' });
  const r = await request(server).get('/pots?$limit=hahhah').expect(200);
  a.equal(r.body.length, 10);
});

test('?$page, OK', async () => {
  await db.collection('chickens').insertOne({ name: 'Puky' });
  await db.collection('chickens').insertOne({ name: 'Puky' });
  await db.collection('chickens').insertOne({ name: 'Puky' });
  await db.collection('chickens').insertOne({ name: 'Lola' });
  await db.collection('chickens').insertOne({ name: 'Lola' });
  await db.collection('chickens').insertOne({ name: 'Lola' });
  const r = await request(server).get('/chickens?$limit=3&$page=1').expect(200);
  a.equal(r.body.length, 3);
  a.isTrue(r.body.every(chicken => chicken.name === 'Lola'), 'Bad pagination');
});
test('?$page, invalid', async () => {
  await db.collection('chickens').insertOne({ name: 'Puky' });
  await db.collection('chickens').insertOne({ name: 'Puky' });
  await db.collection('chickens').insertOne({ name: 'Puky' });
  await db.collection('chickens').insertOne({ name: 'Lola' });
  await db.collection('chickens').insertOne({ name: 'Lola' });
  await db.collection('chickens').insertOne({ name: 'Lola' });
  const r = await request(server).get('/chickens?$limit=3&$page=hahaha').expect(200);
  a.equal(r.body.length, 3);
  a.isTrue(r.body.every(chicken => chicken.name === 'Puky'), 'Bad pagination');
});

test('?$query, OK {}', async () => {
  await db.collection('horses').insertOne({ name: 'Puky' });
  await db.collection('horses').insertOne({ name: 'Puky' });
  await db.collection('horses').insertOne({ name: 'Puky' });
  await db.collection('horses').insertOne({ name: 'Lola' });
  await db.collection('horses').insertOne({ name: 'Lola' });
  await db.collection('horses').insertOne({ name: 'Lola' });
  const r = await request(server).get('/horses?$query={}').expect(200);
  a.equal(r.body.length, 6);
});
test('?$query, OK {"name":"Puky"}', async () => {
  await db.collection('hippos').insertOne({ name: 'Puky' });
  await db.collection('hippos').insertOne({ name: 'Puky' });
  await db.collection('hippos').insertOne({ name: 'Puky' });
  await db.collection('hippos').insertOne({ name: 'Lola' });
  await db.collection('hippos').insertOne({ name: 'Lola' });
  await db.collection('hippos').insertOne({ name: 'Lola' });
  const r = await request(server).get('/hippos?$query={"name":"Puky"}').expect(200);
  a.equal(r.body.length, 3);
});
test('?$query, invalid', async () => {
  const r = await request(server).get('/hippos?$query={"name":"Puky}').expect(400);
});

test('?$sort=name, OK', async () => {
  await db.collection('robots').insertOne({ name: 4 });
  await db.collection('robots').insertOne({ name: 2 });
  await db.collection('robots').insertOne({ name: 3 });
  await db.collection('robots').insertOne({ name: 1 });
  await db.collection('robots').insertOne({ name: 5 });
  const r = await request(server).get('/robots?$sort=name').expect(200);
  a.equal(r.body[0].name, 1);
  a.equal(r.body[1].name, 2);
  a.equal(r.body[2].name, 3);
  a.equal(r.body[3].name, 4);
  a.equal(r.body[4].name, 5);
});
test('?$sort=[name,age], OK');
test('?$sort=invalid, BAD_REQUEST');

test('?$order=desc, OK', async () => {
  await db.collection('androids').insertOne({ name: 4 });
  await db.collection('androids').insertOne({ name: 2 });
  await db.collection('androids').insertOne({ name: 3 });
  await db.collection('androids').insertOne({ name: 1 });
  await db.collection('androids').insertOne({ name: 5 });
  const r = await request(server).get('/androids?$sort=name&$order=desc').expect(200);
  a.equal(r.body[0].name, 5);
  a.equal(r.body[1].name, 4);
  a.equal(r.body[2].name, 3);
  a.equal(r.body[3].name, 2);
  a.equal(r.body[4].name, 1);
});
test('?$order=asc, OK', async () => {
  await db.collection('nanoids').insertOne({ name: 4 });
  await db.collection('nanoids').insertOne({ name: 2 });
  await db.collection('nanoids').insertOne({ name: 3 });
  await db.collection('nanoids').insertOne({ name: 1 });
  await db.collection('nanoids').insertOne({ name: 5 });
  const r = await request(server).get('/nanoids?$sort=name&$order=asc').expect(200);
  a.equal(r.body[0].name, 1);
  a.equal(r.body[1].name, 2);
  a.equal(r.body[2].name, 3);
  a.equal(r.body[3].name, 4);
  a.equal(r.body[4].name, 5);
});
test('?$order=[asc,desc], OK');
test('?$order=invalid, BAD_REQUEST');

test('?$populate, OK, 1 population', async () => {
  await db.collection('companies').insertOne({ _id: 1, name: 'corp' });
  await db.collection('companies').insertOne({ _id: 2, name: 'inc' });
  await db.collection('employees').insertOne({ _id: 1, name: 'Foobio', company_id: 1 });
  await db.collection('employees').insertOne({ _id: 2, name: 'Barfy', company_ids: [1, 2] });
  const r = await request(server).get('/companies?$populate=employees').expect(200);

  a.equal(r.body[0].employees.length, 2, '$populate failed');
  a.equal(r.body[1].employees.length, 1, '$populate failed');

  const r2 = await request(server).get('/employees?$fill=companies').expect(200);
  a.equal(r2.body[0].companies.length, 1, '$fill failed');
  a.equal(r2.body[1].companies.length, 2, '$fill failed');
});
test('?$populate, OK, 2 multitple population');
test('?$populate, BAD_REQUEST');

test('?$range, OK, 1 range');
test('?$range, OK, multiple ranges');
test('?$range, BAD_REQUEST');

test('?$text, OK');
test('?$text, BAD_REQUEST');

test('?$regex, OK');
test('?$regex, BAD_REQUEST');

/**
 * GET /resources/id endpoint
 */
suite('GET /:resource/:id');
test('OK', async () => {
  const v = await db.collection('parrots').insertOne({ _id: 'paco', name: 'Paco' });
  const r = await request(server).get('/parrots/paco').expect(200);
  a.equal(r.body.name, 'Paco');
});
test('NOT_FOUND', async () => {
  const r = await request(server).get('/parrots/puki').expect(404);
});

/**
 * PUT /resources/id endpoint
 */
suite('PUT /:resource/:id');
test('OK', async () => {
  const v = await db.collection('birds').insertOne({ _id: 'paco', name: 'Paco' });
  const r = await request(server).put('/birds/paco').send({ age: 20 }).expect(200);
  a.equal(r.body.name, undefined);
  a.equal(r.body.age, 20);
});
test('NOT_FOUND', async () => {
  const r = await request(server).put('/birds/puki').expect(404);
});

/**
 * PATCH /resources/id endpoint
 */
suite('PUT /:resource/:id');
test('OK', async () => {
  const v = await db.collection('dinosaurs').insertOne({ _id: 'paco', name: 'Paco' });
  const r = await request(server).patch('/dinosaurs/paco').send({ age: 20 }).expect(200);
  a.equal(r.body.name, 'Paco');
  a.equal(r.body.age, 20);
});
test('NOT_FOUND', async () => {
  const r = await request(server).patch('/dinosaurs/puki').send({ age: 20 }).expect(404);
});
test('BAD_REQUEST, body is empty', async () => {
  const r = await request(server).patch('/dinosaurs/puki').expect(400);
});

/**
 * DELETE /resources/id endpoint
 */
suite('DELETE /:resource/:id');
test('OK', async () => {
  const v = await db.collection('bears').insertOne({ _id: 'paco', name: 'Paco' });
  const r = await request(server).delete('/bears/paco').send({ age: 20 }).expect(204);
});
test('NOT_FOUND', async () => {
  const r = await request(server).delete('/bears/paco').send({ age: 20 }).expect(404);
});
test('?soft, OK');

suite('POST /:resourceWithEmailEnabled/:id');
test('missing resources item', async () => {
  a.throws(() => createServer({
    nodemailer: {
      service: 'MailDev',
    },
  }, db), /nodemailer/);
});
test('resources field is present', async () => {
  createServer({
    resources: {
      dogs: { email: { to: ['fega.hg@gmail.com'] } },
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);
});
test('OK', async () => {
  const server2 = await createServer({
    resources: {
      dogs: { email: { to: ['fega.hg@gmail.com'] } },
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);

  const r = await request(server2).post('/dogs').send({ name: 'Awesome dog' });
  console.log(r.body);
  await delay(500);
  a.equal(r.status, 200);
});