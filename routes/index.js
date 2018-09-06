
const express = require('express');
const { ObjectId } = require('mongodb');
const HttpError = require('http-errors');
const pluralize = require('pluralize');
const { omit, get } = require('lodash');
const { asyncController, htmlEmailTemplate } = require('./util');

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
        limit: getNumber($limit, 10),
        skip: getNumber($page, 0) * getNumber($limit, 10),
        sort: getSort($sort, $order),
      },
    ).toArray();
    return result;
  };
  const findAndPopulate = async (resource, query) => {
    const {
      $limit, $page, $sort, $order, $populate, $range, $text, $regex, $query, $fill, ...filter
    } = query;
    const prePopulate1 = `____${$populate}`;
    const prePopulate2 = `__${$populate}`;
    const preParent1 = `----${$fill}`;
    const preParent2 = `--${$fill}`;

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
          as: prePopulate1,
        },
      });
      pipeline.push({
        $lookup:
        {
          from: $populate,
          localField: '_id',
          foreignField: `${pluralize.singular(resource)}_ids`,
          as: prePopulate2,
        },
      });
    }
    if ($fill) {
      pipeline.push({
        $lookup:
        {
          from: resource,
          localField: `${pluralize.singular($fill)}_id`,
          foreignField: '_id',
          as: preParent1,
        },
      });
      pipeline.push({
        $lookup:
        {
          from: resource,
          localField: `${pluralize.singular($fill)}_ids`,
          foreignField: '_id',
          as: preParent2,
        },
      });
    }
    // execute aggregation
    const result = await db.collection(resource).aggregate(pipeline).toArray();

    // merge fields
    const r = result.map((object) => {
      let completeObject = object;
      // populate processing
      if ($populate) {
        const partialObject = omit(object, [prePopulate1, prePopulate2]);
        completeObject = {
          [$populate]: [...object[prePopulate1], ...object[prePopulate2]],
          ...partialObject,
        };
      }
      // parent processing
      if ($fill) {
        const partialObject = omit(object, [preParent1, preParent2]);
        completeObject = {
          [$fill]: [...object[preParent1], ...object[preParent2]],
          ...partialObject,
        };
      }
      return completeObject;
    });
    return r;
  };

  /**
   * Restrict endpoints
   */
  if (config.restrict) {
    const { resources } = config;
    if (!resources) throw new Error('config.resources Option is necessary when restrict is set to true');

    const allowedResources = Array.isArray(resources)
      ? resources
      : Object.keys(resources).filter(item => resources[item]);

    router.use(['/:resource', '/:resource/:id'], (req, res, next) => {
      if (allowedResources.includes(req.params.resource)) return next();
      throw new HttpError[404]('Not found');
    });
  }

  /**
   * Email endpoints
   */
  if (config.nodemailer) {
    const { resources, nodemailer } = config;
    if (!resources) throw new Error('config.resources Option is necessary when nodemailer is set to true');
    const Nodemailer = require('nodemailer'); // eslint-disable-line
    const transport = Nodemailer.createTransport(nodemailer);

    const emailResources = Array.isArray(resources)
      ? []
      : Object.keys(resources).filter(item => get(resources[item], 'email'));
    router.post(['/:resource', '/:resource/:id'], (req, res, next) => {
      if (!emailResources.includes(req.params.resource)) return next();
      const resource = resources[req.params.resource];
      transport.sendMail({
        from: 'email@email.com',
        to: resource.email.to,
        text: 'Text',
        html: htmlEmailTemplate(req.path, req.body),
        title: resource.email.title || `An email from moserApi POST /${req.params.resource}`,
      }).then(() => next()).catch(next);
    });
  }

  /**
   * Routes
   */
  router.get('/:resource', asyncController(async (req, res) => {
    const {
      $populate, $fill,
    } = req.query;
    const result = ($populate || $fill)
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
