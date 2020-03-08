// @ts-nocheck
/* eslint-env node, mocha */
const chai = require('chai');
const request = require('supertest');
const sinon = require('sinon');
const Joi = require('joi');
const { ObjectID } = require('mongodb');
// const MailDev = require('maildev');
const delay = require('delay');
const asPromised = require('chai-as-promised');
const DateJs = require('date.js');
const createServer = require('../server');
const mongo = require('../lib/mongodb/connect');

chai.use(asPromised);

// const maildev = new MailDev();
// maildev.on('error', console.error);
// maildev.listen();

const a = chai.assert;
let db;
let server;
before(async () => {
  ([db] = await mongo());
  server = await createServer({
    silent: true,
    pagination: 10,
    port: 3000,
    noListen: true,
    resources: {
      products: {
        out: resource => ({ ...resource, extraField: true }),
      },
    },
    settings: {
      restrictWhereQuery: true,
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


test('middlewares, NO middlewares', async () => {
  const server2 = await createServer({
    silent: true,
    resources: {
      dogs: {
        middleware: { initial: false },
      },
    },
  }, db);
  await db.collection('posts').insertOne({ title: 'a title' });
  const r = await request(server2).get('/posts').expect(200);
  a.equal(r.body[0].title, 'a title');
});
test('middlewares, INITIAL, resource middleware', async () => {
  let pass = false;
  let passGet = false;
  let passPatch = false;
  let passPost = false;
  let passPut = false;
  let passDelete = false;
  let passGetId = false;
  ([db] = await mongo());
  const server2 = await createServer({
    silent: true,
    resources: {
      dogs: {
        middleware: {
          initial: [(req, res, next) => {
            pass = true;
            next();
          }],
        },
        get: {
          middleware: { initial: (req, res, next) => { passGet = true; next(); } },
        },
        getId: {
          middleware: { initial: (req, res, next) => { passGetId = true; next(); } },

        },
        post: {
          middleware: { initial: (req, res, next) => { passPost = true; next(); } },
        },
        patch: {
          middleware: { initial: (req, res, next) => { passPatch = true; next(); } },
        },
        put: {
          middleware: { initial: (req, res, next) => { passPut = true; next(); } },
        },
        delete: {
          middleware: { initial: (req, res, next) => { passDelete = true; next(); } },
        },
      },
    },
  }, db);
  await request(server2).get('/dogs').expect(200);
  await request(server2).get('/dogs/:id').expect(404);
  await request(server2).post('/dogs/').expect(200);
  await request(server2).patch('/dogs/:id').expect(400);
  await request(server2).put('/dogs/:id').expect(404);
  await request(server2).delete('/dogs/:id').expect(404);
  a.isTrue(pass, 'initial middleware not called');
  a.isTrue(passGet, 'initial GET middleware not called');
  a.isTrue(passGetId, 'initial GET ID middleware not called');
  a.isTrue(passPost, 'initial POST middleware not called');
  a.isTrue(passPatch, 'initial PATCH middleware not called');
  a.isTrue(passPut, 'initial PUT middleware not called');
  a.isTrue(passDelete, 'initial DELETE middleware not called');
});
test('middlewares, AFTER AUTH, resource middleware', async () => {
  let pass = false;
  let passGet = false;
  let passPatch = false;
  let passPost = false;
  let passPut = false;
  let passDelete = false;
  let passGetId = false;
  ([db] = await mongo());
  const server2 = await createServer({
    silent: true,
    resources: {
      dogs: {
        middleware: {
          initial: [(req, res, next) => {
            pass = true;
            next();
          }],
        },
        get: {
          middleware: { afterAuth: (req, res, next) => { passGet = true; next(); } },
        },
        getId: {
          middleware: { afterAuth: (req, res, next) => { passGetId = true; next(); } },

        },
        post: {
          middleware: { afterAuth: (req, res, next) => { passPost = true; next(); } },
        },
        patch: {
          middleware: { afterAuth: (req, res, next) => { passPatch = true; next(); } },
        },
        put: {
          middleware: { afterAuth: (req, res, next) => { passPut = true; next(); } },
        },
        delete: {
          middleware: { afterAuth: (req, res, next) => { passDelete = true; next(); } },
        },
      },
    },
  }, db);
  await request(server2).get('/dogs').expect(200);
  await request(server2).get('/dogs/:id').expect(404);
  await request(server2).post('/dogs/').expect(200);
  await request(server2).patch('/dogs/:id').expect(400);
  await request(server2).put('/dogs/:id').expect(404);
  await request(server2).delete('/dogs/:id').expect(404);
  a.isTrue(pass, 'initial middleware not called');
  a.isTrue(passGet, 'initial GET middleware not called');
  a.isTrue(passGetId, 'initial GET ID middleware not called');
  a.isTrue(passPost, 'initial POST middleware not called');
  a.isTrue(passPatch, 'initial PATCH middleware not called');
  a.isTrue(passPut, 'initial PUT middleware not called');
  a.isTrue(passDelete, 'initial DELETE middleware not called');
});
test('middlewares, AFTER VALIDATION, resource middleware', async () => {
  let pass = false;
  let passGet = false;
  let passPatch = false;
  let passPost = false;
  let passPut = false;
  let passDelete = false;
  let passGetId = false;
  ([db] = await mongo());
  const server2 = await createServer({
    silent: true,
    resources: {
      dogs: {
        middleware: {
          initial: [(req, res, next) => {
            pass = true;
            next();
          }],
        },
        get: {
          middleware: { afterValidation: (req, res, next) => { passGet = true; next(); } },
        },
        getId: {
          middleware: { afterValidation: (req, res, next) => { passGetId = true; next(); } },

        },
        post: {
          middleware: { afterValidation: (req, res, next) => { passPost = true; next(); } },
        },
        patch: {
          middleware: { afterValidation: (req, res, next) => { passPatch = true; next(); } },
        },
        put: {
          middleware: { afterValidation: (req, res, next) => { passPut = true; next(); } },
        },
        delete: {
          middleware: { afterValidation: (req, res, next) => { passDelete = true; next(); } },
        },
      },
    },
  }, db);
  await request(server2).get('/dogs').expect(200);
  await request(server2).get('/dogs/:id').expect(404);
  await request(server2).post('/dogs/').expect(200);
  await request(server2).patch('/dogs/:id').expect(400);
  await request(server2).put('/dogs/:id').expect(404);
  await request(server2).delete('/dogs/:id').expect(404);
  a.isTrue(pass, 'initial middleware not called');
  a.isTrue(passGet, 'initial GET middleware not called');
  a.isTrue(passGetId, 'initial GET ID middleware not called');
  a.isTrue(passPost, 'initial POST middleware not called');
  a.isTrue(passPatch, 'initial PATCH middleware not called');
  a.isTrue(passPut, 'initial PUT middleware not called');
  a.isTrue(passDelete, 'initial DELETE middleware not called');
});

suite('GET /:resource, FILTERS');
before(async () => {
  ([db] = await mongo());
  server = await createServer({
    silent: true,
    pagination: 10,
    port: 3000,
    noListen: true,
    resources: {
      products: {
        out: resource => ({ ...resource, extraField: true }),
      },
      xompanies: {
        population: {
          xmployees: {
            $sort: 'points',
            $order: 'desc',
            $limit: 2,
          },
        },
      },
    },
    settings: {
      restrictWhereQuery: true,
    },
  }, db);
});
after(async () => {
  await db.dropDatabase();
});
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
  a.equal(r.body[0].author, 'tata');
});
test('filters :ne, not equal', async () => {
  await db.collection('ne-comments').insertOne({ author: 'fabian' });
  await db.collection('ne-comments').insertOne({ author: 'fabian' });
  await db.collection('ne-comments').insertOne({ author: 'tata' });
  await db.collection('ne-comments').insertOne({ author: 'tata' });
  const r = await request(server).get('/ne-comments?author:ne=tata').expect(200);
  a.equal(r.body.length, 2);
  a.equal(r.body[0].author, 'fabian');
});

test('filters :co, type coercion');

test('filters :date, Date coercion', async () => {
  const date = new Date();
  await db.collection('date-filters').insertOne({ createdAt: date });
  await db.collection('date-filters').insertOne({ createdAt: DateJs('yesterday') });

  const r = await request(server)
    .get(`/date-filters?createdAt:date=${date.toISOString()}`)
    .expect(200);

  a.equal(r.body.length, 1);
});
test('filters :date, Date coercion, invalid date', async () => {
  const date = new Date();
  await db.collection('date-filters').insertOne({ createdAt: date });
  await db.collection('date-filters').insertOne({ createdAt: DateJs('yesterday') });

  const r = await request(server)
    .get('/date-filters?createdAt:date=dsdsadasds')
    .expect(200);

  a.equal(r.body.length, 0);
});
test('filters :id, ObjectID Date coercion', async () => {
  const id = new ObjectID();
  await db.collection('objectid-filters').insertOne({ _id: id });

  const r = await request(server)
    .get(`/objectid-filters?_id:id=${id.toString()}`)
    .expect(200);

  a.equal(r.body.length, 1);
});
test('filters :bool, Boolean coercion', async () => {
  await db.collection('bool-filters').insertOne({ boolean: false });
  await db.collection('bool-filters').insertOne({ boolean: true });
  await db.collection('bool-filters').insertOne({ boolean: true });


  const r = await request(server)
    .get('/bool-filters?boolean:bool=true')
    .expect(200);

  a.equal(r.body.length, 2);
});

test('filters :gt, greater than', async () => {
  await db.collection('gt-comments').insertOne({ likes: 9 });
  await db.collection('gt-comments').insertOne({ likes: 10 });
  await db.collection('gt-comments').insertOne({ likes: 10.1 });
  await db.collection('gt-comments').insertOne({ likes: 11 });
  const r = await request(server).get('/gt-comments?likes:gt=10').expect(200);
  a.equal(r.body.length, 2);
  a.equal(r.body[0].likes, 10.1);
});
test('filters :lt, lower than', async () => {
  await db.collection('lt-comments').insertOne({ likes: 9 });
  await db.collection('lt-comments').insertOne({ likes: 10 });
  await db.collection('lt-comments').insertOne({ likes: 10.1 });
  await db.collection('lt-comments').insertOne({ likes: 11 });
  const r = await request(server).get('/lt-comments?likes:lt=10').expect(200);
  a.equal(r.body.length, 1);
  a.equal(r.body[0].likes, 9);
});
test('filters :gte, greater than or equal', async () => {
  await db.collection('gte-comments').insertOne({ likes: 9 });
  await db.collection('gte-comments').insertOne({ likes: 10 });
  await db.collection('gte-comments').insertOne({ likes: 10.1 });
  await db.collection('gte-comments').insertOne({ likes: 11 });
  const r = await request(server).get('/gte-comments?likes:gte=10').expect(200);
  a.equal(r.body.length, 3);
  a.equal(r.body[0].likes, 10);
});
test('filters :lte, lower than or equal', async () => {
  await db.collection('lte-comments').insertOne({ likes: 9 });
  await db.collection('lte-comments').insertOne({ likes: 10 });
  await db.collection('lte-comments').insertOne({ likes: 10.1 });
  await db.collection('lte-comments').insertOne({ likes: 11 });
  const r = await request(server).get('/lte-comments?likes:lte=10').expect(200);
  a.equal(r.body.length, 2);
  a.equal(r.body[0].likes, 9);
});
test('filters :gt:date, greater than date', async () => {
  await db.collection('gtdate-comments').insertOne({ createdAt: DateJs('tomorrow', null) });
  await db.collection('gtdate-comments').insertOne({ createdAt: DateJs('tomorrow', null) });
  await db.collection('gtdate-comments').insertOne({ createdAt: DateJs('yesterday', null) });
  await db.collection('gtdate-comments').insertOne({ createdAt: DateJs('yesterday', null) });

  const r = await request(server).get(`/gtdate-comments?createdAt:gt:date=${new Date().toISOString()}`).expect(200);
  a.equal(r.body.length, 2);
});
test('filters RANGE :gt:date and :lt:date', async () => {
  await db.collection('rangedate-comments').insertOne({ createdAt: DateJs('5 days ago', null) });
  await db.collection('rangedate-comments').insertOne({ createdAt: DateJs('10 days ago', null) });
  await db.collection('rangedate-comments').insertOne({ createdAt: DateJs('30 days ago', null) });
  await db.collection('rangedate-comments').insertOne({ createdAt: DateJs('yesterday', null) });

  const query = `createdAt:gt:date=${DateJs('15 days ago', null).toISOString()}&createdAt:lt:date=${DateJs('3 days ago', null).toISOString()}`;
  const r = await request(server).get(`/rangedate-comments?${query}`).expect(200);

  a.equal(r.body.length, 2);
});

test('filters :nin, only one item', async () => {
  await db.collection('nin-comments').insertOne({ fruits: ['apples'] });
  await db.collection('nin-comments').insertOne({ fruits: ['apples'] });
  await db.collection('nin-comments').insertOne({ fruits: ['apples', 'oranges'] });
  await db.collection('nin-comments').insertOne({ fruits: ['apples', 'oranges'] });
  await db.collection('nin-comments').insertOne({ fruits: 'oranges' });

  const query = 'fruits:nin=oranges';
  const r = await request(server).get(`/nin-comments?${query}`).expect(200);
  a.equal(r.body.length, 2);
});
test('filters :nin, Multiple items', async () => {
  await db.collection('nin-multi-objects').insertOne({ fruits: ['apples'] });
  await db.collection('nin-multi-objects').insertOne({ fruits: ['apples'] });
  await db.collection('nin-multi-objects').insertOne({ fruits: ['apples', 'oranges'] });
  await db.collection('nin-multi-objects').insertOne({ fruits: ['apples', 'bananas'] });
  await db.collection('nin-multi-objects').insertOne({ fruits: ['bananas'] });
  await db.collection('nin-multi-objects').insertOne({ fruits: 'bananas' });
  const query = 'fruits:nin=oranges&fruits:nin=bananas';

  const r = await request(server).get(`/nin-multi-objects?${query}`).expect(200);

  a.equal(r.body.length, 2);
});

test('filters :in, only one item', async () => {
  await db.collection('in-comments').insertOne({ fruits: ['apples'] });
  await db.collection('in-comments').insertOne({ fruits: ['apples'] });
  await db.collection('in-comments').insertOne({ fruits: ['apples', 'oranges'] });
  await db.collection('in-comments').insertOne({ fruits: ['apples', 'oranges'] });

  const query = 'fruits:in=oranges';
  const r = await request(server).get(`/in-comments?${query}`).expect(200);
  a.equal(r.body.length, 2);
});
test('filters :in, Multiple items', async () => {
  await db.collection('in-2-comments').insertOne({ fruits: ['apples'] });
  await db.collection('in-2-comments').insertOne({ fruits: ['apples'] });
  await db.collection('in-2-comments').insertOne({ fruits: ['oranges'] });
  await db.collection('in-2-comments').insertOne({ fruits: ['oranges'] });
  await db.collection('in-2-comments').insertOne({ fruits: ['pears'] });
  await db.collection('in-2-comments').insertOne({ fruits: ['pears'] });

  const query = 'fruits:in=oranges&fruits:in=apples ';
  const r = await request(server).get(`/in-2-comments?${query}`).expect(200);
  a.equal(r.body.length, 4);
});

test('filters :size, ok', async () => {
  await db.collection('size-comments').insertOne({ likes: [1, 2] });
  await db.collection('size-comments').insertOne({ likes: [1, 2, 3, 4] });
  await db.collection('size-comments').insertOne({ likes: [1, 2, 3] });
  await db.collection('size-comments').insertOne({ likes: [1, 2, 3] });
  const r = await request(server).get('/size-comments?likes:size=3').expect(200);
  a.equal(r.body.length, 2);
});

test('filters combined :nin:number', async () => {
  await db.collection('nin-number-filters').insertOne({ likes: [1, 2] });
  await db.collection('nin-number-filters').insertOne({ likes: [1, 2, 3, 4] });
  await db.collection('nin-number-filters').insertOne({ likes: [] });
  await db.collection('nin-number-filters').insertOne({ likes: [1] });
  await db.collection('nin-number-filters').insertOne({ likes: [2] });
  await db.collection('nin-number-filters').insertOne({ likes: [3] });
  await db.collection('nin-number-filters').insertOne({ likes: 3 });
  await db.collection('nin-number-filters').insertOne({ likes: 1 });

  const query = 'likes:nin:number=1&likes:nin:number=2';
  const r = await request(server).get(`/nin-number-filters?${query}`).expect(200);
  a.equal(r.body.length, 3);
});

test('filters combined :in:number', async () => {
  await db.collection('in-number-filters').insertOne({ likes: [1, 2] });
  await db.collection('in-number-filters').insertOne({ likes: [1, 2, 3, 4] });
  await db.collection('in-number-filters').insertOne({ likes: [] });
  await db.collection('in-number-filters').insertOne({ likes: [1] });
  await db.collection('in-number-filters').insertOne({ likes: [2] });
  await db.collection('in-number-filters').insertOne({ likes: [3] });
  await db.collection('in-number-filters').insertOne({ likes: 3 });
  await db.collection('in-number-filters').insertOne({ likes: 1 });

  const query = 'likes:in:number=1&likes:in:number=2';
  const r = await request(server).get(`/in-number-filters?${query}`).expect(200);
  a.equal(r.body.length, 5);
});

test('$select, OK', async () => {
  await db.collection('durians').insertOne({ author: 'fabian' });
  await db.collection('durians').insertOne({ author: 'fabian' });
  await db.collection('durians').insertOne({ author: 'tata' });
  await db.collection('durians').insertOne({ author: 'tata' });
  const r = await request(server).get('/durians?$select=author').expect(200);
  a.equal(r.body.length, 4);
  a.deepEqual(r.body[0], { author: 'fabian' });
});
test('$count, OK', async () => {
  await db.collection('soursops').insertOne({ author: 'fabian' });
  await db.collection('soursops').insertOne({ author: 'fabian' });
  await db.collection('soursops').insertOne({ author: 'fabian' });
  await db.collection('soursops').insertOne({ author: 'fabian' });
  await db.collection('soursops').insertOne({ author: 'fabian' });
  await db.collection('soursops').insertOne({ author: 'fabian' });
  await db.collection('soursops').insertOne({ author: 'fabian' });
  await db.collection('soursops').insertOne({ author: 'fabian' });
  await db.collection('soursops').insertOne({ author: 'fabian' });
  await db.collection('soursops').insertOne({ author: 'fabian' });
  await db.collection('soursops').insertOne({ author: 'tata' });
  await db.collection('soursops').insertOne({ author: 'tata' });
  const r = await request(server).get('/soursops?$count=1').expect(200);
  a.equal(r.body.count, 12);
  const r1 = await request(server).get('/soursops?author=tata&$count=1').expect(200);
  a.equal(r1.body.count, 2);
});
test('filters, BAD_REQUEST unsafe filters', async () => {
  await request(server).get('/comments?$author=tata').expect(400);
});
test('flags, OK', async () => {
  await request(server).get('/comments?$$author=tata').expect(200);
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
test('?$where, invalid', async () => {
  const r = await request(server).get('/hippos?$query={"$where":"Puky"}');
  a.equal(r.status, 400);
  a.equal(r.body.message, 'Invalid $where inside $query parameter');
});
test('?$expr, invalid', async () => {
  const r = await request(server).get('/hippos?$query={"$expr":"Puky"}');
  a.equal(r.status, 400);
  a.equal(r.body.message, 'Invalid $expr inside $query parameter');
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
test('?$populate, OK, population with limits', async () => {
  await db.collection('xompanies').insertOne({ _id: 'a', name: 'corp' });
  await db.collection('xompanies').insertOne({ _id: 'b', name: 'inc' });
  await db.collection('xmployees').insertOne({
    _id: 1, name: 'Foobio', xompany_id: 'a', points: 2,
  });
  await db.collection('xmployees').insertOne({
    _id: 2, name: 'Barfy', xompany_ids: ['a'], points: 1,
  });
  await db.collection('xmployees').insertOne({
    _id: 3, name: 'Barfoo', xompany_id: 'a', points: 3,
  });
  const r = await request(server).get('/xompanies?$populate=xmployees');
  a.equal(r.body[0].xmployees[0].points, 3);
  a.equal(r.body[0].xmployees[1].points, 2);
  a.equal(r.body[0].xmployees.length, 2);
});

test('?$populate, BAD_REQUEST');

test('?$range, OK, 1 range');
test('?$range, OK, multiple ranges');
test('?$range, BAD_REQUEST');

test('?$text, OK');
test('?$text, BAD_REQUEST');

test('?$regex, OK', async () => {
  const i1 = await db.collection('bees').insertOne({ _id: 'PaquiRRis', name: 'PaquiRRis' });
  await db.collection('bees').insertOne({ _id: 'PaquiRRis2', name: 'PacuRRis' });

  const r = await request(server).get('/bees?$regex=["name","paquirris"]');
  a.equal(r.status, 200);
  a.lengthOf(r.body, 1);
  a.equal(r.body[0]._id, 'PaquiRRis');
});
test('?$regex, BAD_REQUEST', async () => {
  const r = await request(server).get('/bees?$regex=[name","paquirris"]');
  a.equal(r.status, 400);
});

test('?$regex, BAD_REQUEST, UNSAFE REGEX', async () => {
  const r = await request(server).get('/bees?$regex=["name","(x%2Bx%2B)%2By"]');
  a.equal(r.status, 400);
  a.equal(r.body.message, 'unsafe $regex');
});

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
test('OK, id is a number', async () => {
  const _id = Math.floor(Math.random() * 10000);
  ([db] = await mongo());

  await db.collection('pigeons').insertOne({ _id, name: 'Paco' });

  const server2 = await createServer({
    silent: true,
    resources: {
      pigeons: {
        in: {
          params: {
            id: Joi.number(),
          },
        },
      },
    },
  }, db);
  await request(server2).get(`/pigeons/${_id}`).expect(200);
});
/**
 * PUT /resources/id endpoint
 */
suite('PUT /:resource/:id');
test('OK', async () => {
  await db.collection('birds').insertOne({ _id: 'paco', name: 'Paco' });
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
  await db.collection('dinosaurs').insertOne({ _id: 'paco', name: 'Paco' });
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
test('?soft, OK', async () => {
  const server2 = await createServer({
    silent: true,
    resources: {
      elephants: {
        softDelete: true,
      },
    },
  }, db);
  const v = await db.collection('elephants').insertOne({ _id: 'paco', name: 'Paco' });
  const r = await request(server2).delete('/elephants/paco').expect(204);

  const item = await db.collection('elephants').findOne({ _id: 'paco' });
  a.notEqual(item, null);
  a.deepEqual(item, { __d: true, _id: 'paco', name: 'Paco' });
});

suite('POST /:resourceWithEmailEnabled/:id');
test('missing resources item', async () => {
  a.throws(() => createServer({
    silent: true,
    nodemailer: {
      service: 'MailDev',
    },
  }, db), /nodemailer/);
});
test('resources field is present', async () => {
  createServer({
    silent: true,
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
    silent: true,
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
    silent: true,
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
    silent: true,
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
