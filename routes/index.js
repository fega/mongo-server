
const express = require('express');
const { ObjectId } = require('mongodb');
const HttpError = require('http-errors');
const passport = require('passport');
const pluralize = require('pluralize');
const {
  omit, get, pickBy,
} = require('lodash');
const { asyncController, htmlEmailTemplate } = require('./util');
const {
  generateLocalStrategies,
  generateJwtPermissionRoutes,
  generateInputValidationRoutes,
} = require('../lib/auth');
const {
  getTextQuery,
  getRegexQuery,
  getRangeQuery,
  getSort,
  getQuery,
  getNumber,
  getFilters,
  getPipelines,
  unrollPopulatePipeline,
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
    pipeline.push(...getPipelines($populate, $fill, resource));
    // execute aggregation
    const result = await db.collection(resource).aggregate(pipeline).toArray();

    // merge fields
    const r = unrollPopulatePipeline($populate, $fill, result);
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
   * Auth local endpoints
   */
  if (config.resources) {
    const { resources, jwtSecret = 'secret', bcryptRounds = 1 } = config;
    const jwt = require('jsonwebtoken');
    const bcrypt = require('bcryptjs');
    // const passport = require('passport');
    // const local = require('passport-local').Strategy;

    const authLocalResources = Object.keys(pickBy(resources, r => get(r, 'auth.local')));
    if (authLocalResources.length) {
      /**
       * sign-up middleware
       */
      router.post('/auth/:resource/sign-up', async (req, res, next) => {
        try {
          if (!authLocalResources.includes(req.params.resource)) return next();
          const resource = resources[req.params.resource];
          const [userField, passField, permissions] = resource.auth.local;
          const userValue = req.body[userField];
          const passValue = req.body[passField];
          if (!userValue || !passValue) {
            return res.sendStatus(400);
          }
          const oldResource = await db.collection(req.params.resource).findOne({
            [userField]: userValue,
          });

          if (oldResource) return res.sendStatus(403);

          const $token = await jwt.sign(
            { [userField]: userValue, resource: req.params.resource, permissions },
            jwtSecret,
          );
          const insert = {
            ...req.body,
            ...permissions ? { permissions } : {},
            [passField]: await bcrypt.hash(passValue, bcryptRounds),
            _id: ObjectId().toString(),
          };
          await db.collection(req.params.resource).insertOne(insert);

          return res.status(200).send({
            ...omit(insert, passValue),
            $token,
          });
        } catch (error) {
          next(error);
        }
      });
      /**
       * log-in middleware
       */
      router.use(passport.initialize());
      generateLocalStrategies(authLocalResources, config, db);
      authLocalResources.map((resourceName) => {
        router.post(
          `/auth/${resourceName}/log-in`,
          passport.authenticate(`local-${resourceName}`, { session: false }),
          (req, res) => res.json(req.user),
        );
      });
    }
  }

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
  router.use(['/:resource/:id', '/:resource'], (req, res, next) => {
    const { resources } = res.locals;
    if (!resources) return next();
    const out = get(config, `resources.${req.params.resource}.out`);
    if (out) {
      if (Array.isArray(resources)) {
        return res.json(resources.map(r => out(r, req.user)));
      }
      return res.json(out(resources, req.user));
    }
    return res.json(resources);
  });
  return router;
};
