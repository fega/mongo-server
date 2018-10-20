
const express = require('express');
const { ObjectId } = require('mongodb');
const HttpError = require('http-errors');
const {
  get,
} = require('lodash');
const { asyncController } = require('./util');
const {
  generateAuthLocalHandlers,
  generateJwtPermissionRoutes,
  generateInputValidationRoutes,
  generateRestrictHandlers,
  generateNodemailerHandlers,
} = require('../lib/middleware');
const {
  getTextQuery,
  getRegexQuery,
  getRangeQuery,
  getSort,
  getQuery,
  getNumber,
  getFilters,
  getPopulatePipelines,
  unrollPopulatePipeline,
  getOut,
} = require('../lib');

module.exports = (config, db) => {
  const router = express.Router();
  /**
   * Executes a simple query
   * @param {String} resource resource being query
   * @param {Object} query Query Express Object
   */
  const find = async (resource, query) => {
    const {
      $limit, $page, $sort, $order, $populate, $range, $text, $regex, $query, $fill, ...filter
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
        limit: getNumber($limit, config.pagination),
        skip: getNumber($page, 0) * getNumber($limit, config.pagination),
        sort: getSort($sort, $order),
      },
    ).toArray();
    return result;
  };
  const findAndPopulate = async (resource, query) => {
    const {
      $limit, $page, $sort, $order, $populate, $range, $text, $regex, $query, $fill, ...filter
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
    pipeline.push({ $skip: getNumber($page, 0) * getNumber($limit, config.pagination) });
    pipeline.push({ $limit: getNumber($limit, config.pagination) });
    pipeline.push(...getPopulatePipelines($populate, $fill, resource));
    // execute aggregation
    const result = await db.collection(resource).aggregate(pipeline).toArray();

    // merge fields
    const r = unrollPopulatePipeline($populate, $fill, result);
    return r;
  };

  /**
   * Restrict endpoints
   */
  generateRestrictHandlers(config, router);

  /**
   * Auth local endpoints
   */
  generateAuthLocalHandlers(config, router, db);

  /**
   * Permission endpoints
   */
  generateJwtPermissionRoutes(config, router);

  /**
   * Generate Validation endpoints
   */
  generateInputValidationRoutes(config, router);

  /**
   * Email endpoints
   */
  generateNodemailerHandlers(config, router);

  /**
   * Routes, retrieve resources
   */
  router.get('/:resource', asyncController(async (req, res, next) => {
    if (get(config, `resources.${req.params.resource}.get`) === false) return next();
    const { $populate, $fill } = req.query;

    const result = ($populate || $fill)
      ? await findAndPopulate(req.params.resource, req.query)
      : await find(req.params.resource, req.query);
    res.locals.resources = result;
    return next();
  }));
  router.get('/:resource/:id', asyncController(async (req, res, next) => {
    if (get(config, `resources.${req.params.resource}.getId`) === false) return next();
    const result = await db.collection(req.params.resource).findOne({ _id: req.params.id });
    if (!result) return next(HttpError(404, 'Not found'));
    res.locals.resources = result;
    return next();
  }));
  router.post('/:resource/', asyncController(async (req, res, next) => {
    if (get(config, `resources.${req.params.resource}.post`) === false) return next();

    const insert = {
      ...req.body,
      _id: ObjectId().toString(),
    };
    await db.collection(req.params.resource).insertOne(insert);
    res.locals.resources = insert;
    return next();
  }));
  router.put('/:resource/:id', asyncController(async (req, res, next) => {
    if (get(config, `resources.${req.params.resource}.put`) === false) return next();

    const { _id, ...put } = req.body;
    const result = await db
      .collection(req.params.resource)
      .findOneAndReplace({ _id: req.params.id }, put, {
        returnOriginal: false,
      });
    if (!result.value) return next(HttpError(404, 'Resource not found'));
    res.locals.resources = result.value;
    return next();
  }));
  router.patch('/:resource/:id', asyncController(async (req, res, next) => {
    if (get(config, `resources.${req.params.resource}.patch`) === false) return next();

    const { _id, ...patch } = req.body;
    if (!Object.keys(patch).length) return next(HttpError(400, 'Missing body'));
    const result = await db
      .collection(req.params.resource)
      .findOneAndUpdate({ _id: req.params.id }, { $set: patch }, {
        returnOriginal: false,
      });
    if (!result.value) return next(HttpError(404, 'Resource not found'));
    res.locals.resources = result.value;
    return next();
  }));
  router.delete('/:resource/:id', asyncController(async (req, res, next) => {
    if (get(config, `resources.${req.params.resource}.delete`) === false) return next();
    const result = await db
      .collection(req.params.resource)
      .findOneAndDelete({ _id: req.params.id });
    if (!result.value) return next(HttpError(404, 'Resource not found'));
    return res.sendStatus(204);
  }));
  /**
   * Routes, Execute permissions
   */

  // pending

  /**
   * Routes, Execute logic handlers
   */

  // pending

  /**
   * get outputs
   */
  router.use(['/:resource/:id', '/:resource'], (req, res, next) => {
    const { resources } = res.locals;
    if (!resources) return next();
    return res.json(getOut(
      req.params.resource,
      resources,
      config,
      req.user,
      req.query.$populate,
      req.query.$fill,
    ));
  });
  return router;
};
