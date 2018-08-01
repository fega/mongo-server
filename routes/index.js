const express = require('express');
const { ObjectId } = require('mongodb');
const HttpError = require('http-errors');
const pluralize = require('pluralize');
const { omit } = require('lodash');

const asyncController = asyncFn => (req, res, next) => Promise.resolve(asyncFn(req, res, next)).catch(next);

const {
  getTextQuery,
  getRegexQuery,
  getRangeQuery,
  getSort,
  populate,
  getQuery,
  getNumber,
  getFilters,
} = require('../lib');


module.exports = (db) => {
  const router = express.Router();
  /**
   * Executes a simple query
   * @param {String} resource resource being query
   * @param {Object} query Query Express Object
   */
  const find = async (resource, query) => {
    const {
      $limit, $page, $sort, $order, $populate, $range, $text, $regex, $query, ...filter
    } = query;
    const result = await db.collection(resource).find(
      {
        ...getQuery($query),
        ...getTextQuery($text),
        ...getRegexQuery($regex),
        ...getRangeQuery($range),
        ...getFilters(filter),
      },
      {
        limit: getNumber($limit, 10),
        skip: getNumber($page, 0) * getNumber($limit, 10),
        sort: getSort($sort, $order),
      },
    ).toArray();
    return result;
  };
  const findAndPopulate = async (resource, query) => {
    const {
      $limit, $page, $sort, $order, $populate, $range, $text, $regex, $query, ...filter
    } = query;

    // Build pipeline
    const pipeline = [{
      $match: {
        ...getQuery($query),
        ...getTextQuery($text),
        ...getRegexQuery($regex),
        ...getRangeQuery($range),
        ...getFilters(filter),
      },
    }];
    if ($sort) pipeline.push({ $sort: getSort($sort, $order) });
    pipeline.push({ $skip: getNumber($page, 0) * getNumber($limit, 10) });
    pipeline.push({ $limit: getNumber($limit, 10) });
    if ($populate) {
      pipeline.push({
        $lookup:
        {
          from: $populate,
          localField: '_id',
          foreignField: `${pluralize.singular(resource)}_id`,
          as: `____${$populate}`,
        },
      });
      pipeline.push({
        $lookup:
        {
          from: $populate,
          localField: '_id',
          foreignField: `${pluralize.singular(resource)}_ids`,
          as: `__${$populate}`,
        },
      });
    }
    // execute aggregation
    const result = await db.collection(resource).aggregate(pipeline).toArray();
    // merge fields
    const r = result.map((value) => {
      const partialObject = omit(value, [`____${$populate}`, `__${$populate}`]);
      return {
        [$populate]: [...value[`____${$populate}`], ...value[`__${$populate}`]],
        ...partialObject,
      };
    });
    return r;
  };
  router.get('/:resource', asyncController(async (req, res) => {
    const {
      $populate,
    } = req.query;
    const result = $populate
      ? await findAndPopulate(req.params.resource, req.query)
      : await find(req.params.resource, req.query);
    res.json($populate ? populate(result) : result);
  }));
  router.get('/:resource/:id', asyncController(async (req, res, next) => {
    const result = await db.collection(req.params.resource).findOne({ _id: req.params.id });
    if (!result) return next(HttpError(404, 'Not found'));
    return res.send(result);
  }));
  router.post('/:resource/', asyncController(async (req, res) => {
    const insert = {
      ...req.body,
      _id: ObjectId().toString(),
    };
    await db.collection(req.params.resource).insertOne(insert);
    res.send(insert);
  }));
  router.put('/:resource/:id', asyncController(async (req, res, next) => {
    const { _id, ...put } = req.body;
    const result = await db
      .collection(req.params.resource)
      .findOneAndReplace({ _id: req.params.id }, put, {
        returnOriginal: false,
      });
    if (!result.value) return next(HttpError(404, 'Resource not found'));
    return res.send(result.value);
  }));
  router.patch('/:resource/:id', asyncController(async (req, res, next) => {
    const { _id, ...patch } = req.body;
    if (!Object.keys(patch).length) return next(HttpError(400, 'Missing body'));
    const result = await db
      .collection(req.params.resource)
      .findOneAndUpdate({ _id: req.params.id }, { $set: patch }, {
        returnOriginal: false,
      });
    if (!result.value) return next(HttpError(404, 'Resource not found'));
    return res.send(result.value);
  }));
  router.delete('/:resource/:id', asyncController(async (req, res, next) => {
    const result = await db
      .collection(req.params.resource)
      .findOneAndDelete({ _id: req.params.id });
    if (!result.value) return next(HttpError(404, 'Resource not found'));
    return res.sendStatus(204);
  }));
  return router;
};
