/* eslint-env node, mocha */
const chai = require('chai');
const sinon = require('sinon');
const {
  getStaticPermissions,
  getDynamicPermissions,
  checkStaticPermissions,
  checkDynamicPermissions,
} = require('../lib/middleware');

const a = chai.assert;


suite('getStaticPermissions');

test('("text")', () => {
  const r = getStaticPermissions('text');
  a.deepEqual(r, [['text']]);
});
test('("1","2")', () => {
  const r = getStaticPermissions(['1', '2']);
  a.deepEqual(r, [['1', '2']]);
});
test('("$special")', () => {
  const r = getStaticPermissions('$special');
  a.deepEqual(r, null);
});
test('(["$special"])', () => {
  const r = getStaticPermissions(['$special']);
  a.deepEqual(r, null);
});
test('([["$special"],["hey"]])', () => {
  const r = getStaticPermissions([['$special'], ['hey']]);
  a.deepEqual(r, null);
});
test('([["$special","all"],["hey"]])', () => {
  const r = getStaticPermissions([['$special', 'all'], ['hey']]);
  a.deepEqual(r, [['all'], ['hey']]);
});
test('(["arr"])', () => {
  const r = getStaticPermissions(['arr']);
  a.deepEqual(r, [['arr']]);
});
test('(["arr","hey"])', () => {
  const r = getStaticPermissions(['arr', 'hey']);
  a.deepEqual(r, [['arr', 'hey']]);
});
test('([["hello"]])', () => {
  const r = getStaticPermissions([['hello']]);
  a.deepEqual(r, [['hello']]);
});
test('(["arr","hey",["hello"]])', () => {
  const r = getStaticPermissions(['arr', 'hey', ['hello']]);
  a.deepEqual(r, [['arr'], ['hey'], ['hello']]);
});

test('2, should throw', () => {
  a.throws(() => getStaticPermissions(2));
});
test('()=>{}, should throw', () => {
  a.throws(() => getStaticPermissions(() => { }));
});
test('{}, should throw', () => {
  a.throws(() => getStaticPermissions({}));
});

suite('getDynamicPermissions');

test('("text")', () => {
  const r = getDynamicPermissions('text');
  a.deepEqual(r, [['text']]);
});
test('(["arr"])', () => {
  const r = getDynamicPermissions(['arr']);
  a.deepEqual(r, [['arr']]);
});
test('(["arr","hey"])', () => {
  const r = getDynamicPermissions(['arr', 'hey']);
  a.deepEqual(r, [['arr', 'hey']]);
});
test('([["hello"]])', () => {
  const r = getDynamicPermissions([['hello']]);
  a.deepEqual(r, [['hello']]);
});
test('(["arr","hey",["hello"]])', () => {
  const r = getDynamicPermissions(['arr', 'hey', ['hello']]);
  a.deepEqual(r, [['arr'], ['hey'], ['hello']]);
});


test('2, should throw', () => {
  a.throws(() => getDynamicPermissions(2));
});
test('()=>{}, should throw', () => {
  a.throws(() => getDynamicPermissions(() => { }));
});
test('{}, should throw', () => {
  a.throws(() => getDynamicPermissions({}));
});

suite('checkStaticPermissions');
test('("$special"), calls next()', () => {
  const next = sinon.spy(() => { });
  checkStaticPermissions('$special')({}, {}, next);
  a.ok(next.calledOnce);
  a.equal(next.firstCall.args.length, 0);
});
test('("normal") without user', () => {
  const next = sinon.spy(() => { });
  checkStaticPermissions('normal')({}, {}, next);
  a.ok(next.calledOnce);
  a.equal(next.firstCall.args[0].message, 'Unauthorized');
});
test('("admin"), user pass, calls next()', () => {
  const next = sinon.spy(() => { });
  checkStaticPermissions('admin')({
    user: {
      permissions: ['admin'],

    },
  }, {}, next);
  a.ok(next.calledOnce);
  a.equal(next.firstCall.args.length, 0);
});
test('([["admin","superadmin"]]), user not pass, calls next()', () => {
  const next = sinon.spy(() => { });
  checkStaticPermissions([['admin', 'superadmin']])({
    user: {
      permissions: ['admin'],
    },
  }, {}, next);
  a.ok(next.calledOnce);
  a.equal(next.firstCall.args[0].message, 'Forbidden');
});

suite('checkDynamicPermissions');

test('("something"), no user', () => {
  const next = sinon.spy(() => { });
  checkDynamicPermissions('something')({}, {}, next);
  a.ok(next.calledOnce);
  a.equal(next.firstCall.args.length, 1);
});
test('("something"), user pass', () => {
  const next = sinon.spy(() => { });
  checkDynamicPermissions('something')({
    user: {
      permissions: ['something'],
    },
  }, {
    locals: {
      resources: {},
    },
  }, next);
  a.ok(next.calledOnce);
  a.equal(next.firstCall.args.length, 0);
});
test('("$special"), user pass', () => {
  const next = sinon.spy(() => { });
  const special = {
    $special: ({ user }) => user._id === 1,
  };
  checkDynamicPermissions('$special', special)({
    user: {
      _id: 1,
    },
  }, {
    locals: {
      resources: {},
    },
  }, next);
  a.ok(next.calledOnce);
  a.equal(next.firstCall.args.length, 0);
});
test('("$special"), user  NOT pass', () => {
  const next = sinon.spy(() => { });
  const special = {
    $special: ({ user }) => user._id === 1,
  };
  checkDynamicPermissions('$special', special)({
    user: {
      _id: 2,
    },

  }, {
    locals: {
      resources: {},
    },
  }, next);
  a.ok(next.calledOnce);
  a.equal(next.firstCall.args.length, 1);
});
test('("$filterOnly"), user pass', () => {
  const req = {
    user: {
      _id: 2,
    },

  };
  const next = sinon.spy(() => { });

  const special = {
    $filter: ({ user }) => ({ user_id: 1 }),
  };
  checkDynamicPermissions('$filter', {}, special)(req, {
    locals: {
      resources: {},
    },
  }, next);
  a.ok(next.calledOnce);
  a.equal(next.firstCall.args.length, 0);
  a.deepEqual(req.filter, { user_id: 1 });
});
