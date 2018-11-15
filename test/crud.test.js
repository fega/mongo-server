/* eslint-env node, mocha */
const chai = require('chai');
const request = require('supertest');
const sinon = require('sinon');
const MailDev = require('maildev');
const delay = require('delay');
const asPromised = require('chai-as-promised');
const createServer = require('../server');
const mongo = require('../db');

chai.use(asPromised);

// const maildev = new MailDev();
// maildev.listen();

const a = chai.assert;
let db;
let server;
before(async () => {
  db = await mongo();
  server = await createServer({
    pagination: 10,
    port: 3000,
    noListen: true,
    resources: {
      products: {
        out: resource => ({ ...resource, extraField: true }),
      },
    },
  }, db);
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
  await request(server).get('/comments?$author=tata').expect(400);
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
  await request(server).get('/hippos?$query={"name":"Puky}').expect(400);
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
test('?$sort[]=name&$sort[]=age, OK', async () => {
  await db.collection('robots-armors').insertOne({ name: 4, age: 4 });
  await db.collection('robots-armors').insertOne({ name: 2, age: 2 });
  await db.collection('robots-armors').insertOne({ name: 3, age: 3 });
  await db.collection('robots-armors').insertOne({ name: 1, age: 1 });
  await db.collection('robots-armors').insertOne({ name: 5, age: 5 });
  const r = await request(server).get('/robots-armors?$sort[]=name&$sort[]=age').expect(200);
  a.equal(r.body[0].name, 1);
  a.equal(r.body[1].name, 2);
  a.equal(r.body[2].name, 3);
  a.equal(r.body[3].name, 4);
  a.equal(r.body[4].name, 5);
});
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
test('?$order=invalid, BAD_REQUEST');

test('?$populate, OK, 1 population', async () => {
  await db.collection('companies').insertOne({ _id: 1, name: 'corp' });
  await db.collection('companies').insertOne({ _id: 2, name: 'inc' });
  await db.collection('employees').insertOne({ _id: 1, name: 'Foobio', company_id: 1 });
  await db.collection('employees').insertOne({ _id: 2, name: 'Barfy', company_ids: [1, 2] });
  await db.collection('products').insertOne({ _id: 7, name: 'Tonic', company_ids: [1] });
  await db.collection('products').insertOne({ _id: 8, name: 'Salt', company_ids: [1, 2] });
  const r = await request(server).get('/companies?$populate=employees');

  a.equal(r.status, 200, 'companies population failed');
  a.equal(r.body[0].employees.length, 2, '$populate failed');
  a.equal(r.body[1].employees.length, 1, '$populate failed');

  const r2 = await request(server).get('/employees?$fill=companies').expect(200);
  a.equal(r2.body[0].companies.length, 1, '$fill failed');
  a.equal(r2.body[1].companies.length, 2, '$fill failed');
});
test('?$populate, OK, 2 multitple population', async () => {
  const r = await request(server).get('/companies?$populate[]=employees&$populate[]=products');

  a.equal(r.status, 200, 'companies population failed');
  a.equal(r.body[0].employees.length, 2, '$populate failed');
  a.equal(r.body[0].products.length, 2, '$populate failed');
  a.equal(r.body[0].products[0].extraField, true, '$populate OUT function failed');
  a.equal(r.body[1].employees.length, 1, '$populate failed');
  a.equal(r.body[1].products.length, 1, '$populate failed');

  const r2 = await request(server).get('/employees?$fill[]=companies').expect(200);
  a.equal(r2.body[0].companies.length, 1, '$fill failed');
  a.equal(r2.body[1].companies.length, 2, '$fill failed');
});

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
test('?$fill, OK', async () => {
  const v = await db.collection('parrots').insertOne({ _id: 'paquirris', name: 'Paca' });
  const v2 = await db.collection('parrots').insertOne({ _id: 'pacarris', name: 'Paco', parrot_id: 'paquirris' });
  const r = await request(server).get('/parrots/pacarris?$fill=parrots').expect(200);
  a.equal(r.status, 200);
  a.equal(r.body.name, 'Paco');
  a.equal(r.body.parrots[0].name, 'Paca');
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
  await delay(500);
  a.equal(r.status, 200);
});
test('OK, default option', async () => {
  const server2 = await createServer({
    resources: {
      giraffes: {
        post: {
          default: () => ({
            $timestamps: true,
            $version: true,
            $changelog: true,
          }),
        },
      },
    },
    nodemailer: {
      service: 'MailDev',
    },
  }, db);

  const r = await request(server2).post('/giraffes').send({ name: 'Awesome Giraffe' });
  await delay(500);
  a.equal(r.status, 200);

  a.exists(r.body.updatedAt);
  a.exists(r.body.createdAt);
  a.exists(r.body.__v);
});
suite('Logic handlers, (do fields)');
test('OK', async () => {
  const fn = ({ next }) => next();
  const doGet = sinon.spy(fn);
  const doGetId = sinon.spy(fn);
  const doPost = sinon.spy(fn);
  const doPatch = sinon.spy(fn);
  const doPut = sinon.spy(fn);
  const doDelete = sinon.spy(fn);
  const server2 = await createServer({
    resources: {
      zombies: {
        get: {
          do: doGet,
        },
        getId: {
          do: doGetId,
        },
        post: {
          do: doPost,
        },
        patch: {
          do: doPatch,
        },
        put: {
          do: doPut,
        },
        delete: {
          do: doDelete,
        },
      },
    },
  }, db);

  const _id = 'awesome-id';
  const r = await request(server2).post('/zombies').send({ name: 'Awesome dog', _id });
  const r1 = await request(server2).get('/zombies');
  const r2 = await request(server2).get('/zombies/awesome-id');
  const r3 = await request(server2).patch('/zombies/awesome-id').send({ name: 'Awesome dog' });
  const r4 = await request(server2).put('/zombies/awesome-id').send({ name: 'Awesome dog' });
  const r5 = await request(server2).delete('/zombies/awesome-id').send({ name: 'Awesome dog' });
  a.equal(r.status, 200);
  a.equal(r1.status, 200);
  a.equal(r2.status, 200);
  a.equal(r3.status, 200);
  a.equal(r4.status, 200);
  a.equal(r5.status, 204);
  a.equal(doPost.calledOnce, true);
  a.equal(doGet.calledOnce, true);
  a.equal(doGetId.calledOnce, true);
  a.equal(doPatch.calledOnce, true);
  a.equal(doPut.calledOnce, true);
  a.equal(doDelete.calledOnce, true);
});
