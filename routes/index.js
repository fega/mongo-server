const swaggerUi = require('swagger-ui-express');
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
  generateDoHandlers,
  generateDynamicPermissionRoutes,
  generateMagicLinkHandlers,
  generateMagicCodeHandlers,
  addMiddleware,
} = require('../lib/middlewareGeneration');
const {
  getTextQuery,
  getRegexQuery,
  getSort,
  getQuery,
  getNumber,
  getFilters,
  getPopulatePipelines,
  unrollPopulatePipeline,
  getOut,
  getDefaultPost,
} = require('../lib');


module.exports = (config, db) => {
  const router = express.Router();
  router.get('/moser-docs/description', (req, res) => {
    res.send(config.description);
  });
  router.get('/moser-docs/swagger.json', (req, res) => {
    res.send(config.swagger);
  });
  router.use('/moser-docs/swagger/', swaggerUi.serve);

  router.get('/moser-docs/swagger/', swaggerUi.setup(JSON.parse(JSON.stringify(config.swagger || {}))));

  /**
   * Executes a simple query
   * @param {String} resource resource being query
   * @param {Object} query Query Express Object
   */
  const find = async (resource, query, filter = {}) => {
    const {
      $limit, $page, $sort, $order, $populate, $range, $count,
      $text, $regex, $query, $fill, $select, ...$filter
    } = query;
    const result = await db.collection(resource).find(
      {
        ...getQuery($query, config),
        ...getTextQuery($text),
        ...getRegexQuery($regex),
        ...getFilters($filter),
        ...filter,
      },
      {
        limit: getNumber($limit, config.pagination),
        skip: getNumber($page, 0) * getNumber($limit, config.pagination),
        sort: getSort($sort, $order),
      },
    ).toArray();
    return result;
  };
  const count = async (resource, query, filter = {}) => {
    const {
      $limit, $page, $sort, $order, $populate, $range, $count,
      $text, $regex, $query, $fill, $select, ...$filter
    } = query;
    const result = await db.collection(resource).count(
      {
        ...getQuery($query, config),
        ...getTextQuery($text),
        ...getRegexQuery($regex),
        ...getFilters($filter),
        ...filter,
      },
      {
        skip: getNumber($page, 0) * getNumber($limit, config.pagination),
        sort: getSort($sort, $order),
      },
    );
    return result;
  };
  const findAndPopulate = async (resource, query, filter = {}, request) => {
    const {
      $limit, $page, $sort, $order, $populate, $range, $count,
      $text, $regex, $query, $fill, $select, ...$filter
    } = query;
    // Build pipeline
    const pipeline = [{
      $match: {
        ...getQuery($query, config),
        ...getTextQuery($text),
        ...getRegexQuery($regex),
        ...getFilters($filter),
        ...filter,
      },
    }];
    // @ts-ignore
    if ($sort) pipeline.push({ $sort: getSort($sort, $order) });

    pipeline.push({ $skip: getNumber($page, 0) * getNumber($limit, config.pagination) });

    pipeline.push({ $limit: getNumber($limit, config.pagination) });

    pipeline.push(...getPopulatePipelines(
      $populate,
      $fill,
      resource,
      get(config, `resources.${resource}.population`),
      request,
    ));
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
   * Populate Db in locals
   */
  router.use('*', (req, res, next) => {
    res.locals.db = db;
    next();
  });
  /**
   * populate filter in locals
   */
  router.get('*', (req, res, next) => {
    const {
      $limit, $page, $sort, $order, $populate, $range, $count,
      $text, $regex, $query, $fill, $select, ...$filter
    } = req.query;

    res.locals.filter = {
      ...getQuery($query, config),
      ...getTextQuery($text),
      ...getRegexQuery($regex),
      ...getFilters($filter),
    };
    next();
  });

  /**
   * Add initial middleware
   */
  addMiddleware('initial')(config, router);

  /**
   * Auth local endpoints
   */
  generateAuthLocalHandlers(config, router, db);
  generateMagicLinkHandlers(config, router, db);
  generateMagicCodeHandlers(config, router, db);

  /**
   * Add afterAuth middleware
   */
  addMiddleware('afterAuth')(config, router);

  /**
   * Permission endpoints
   */
  generateJwtPermissionRoutes(config, router, db);


  /**
   * Add afterAuth middleware
   */
  addMiddleware('afterPermissions')(config, router);

  /**
   * Generate Validation endpoints
   */
  generateInputValidationRoutes(config, router);


  /**
   * Add afterValidation middleware
   */
  addMiddleware('afterValidation')(config, router);

  /**
   * Email endpoints
   */
  generateNodemailerHandlers(config, router);

  addMiddleware('beforeRetrieve')(config, router);
  /**
   * Routes, retrieve resources
   */
  router.get('/:resource/:id', asyncController(async (req, res, next) => {
    // if there is get by Id is not enabled
    if (get(config, `resources.${req.params.resource}.getId`) === false) return next();

    // if there is a previous get id resource (from a middleware)
    if (res.locals.resources) return next();

    // get resource
    const { $populate, $fill } = req.query;
    const result = ($populate || $fill)
      ? (
        await findAndPopulate(
          req.params.resource,
          { $populate, $fill },
          { _id: get(req, 'moser.validation.id', req.params.id) },
          req,
        ))[0]
      : await db.collection(req.params.resource).findOne({ _id: get(req, 'moser.validation.id', req.params.id) });

    if (!result) return next(new HttpError.NotFound('Not found'));
    res.locals.resources = result;
    return next();
  }));
  router.post('/:resource/', asyncController(async (req, res, next) => {
    if (get(config, `resources.${req.params.resource}.post`) === false) return next();

    const defaultFn = get(config, `resources.${req.params.resource}.post.default`);
    const _id = req.body._id || new ObjectId().toString();
    const { body, user } = req;
    const insert = defaultFn
      ? ({ ...await getDefaultPost(defaultFn(body, user), user, req, db), _id })
      : { ...body, _id };

    res.locals.resources = insert;
    return next();
  }));
  router.put('/:resource/:id', asyncController(async (req, res, next) => {
    if (get(config, `resources.${req.params.resource}.put`) === false) return next();

    const result = await db
      .collection(req.params.resource)
      .findOne({ _id: get(req, 'moser.validation.id', req.params.id) });

    if (!result) return next(new HttpError.NotFound('Resource not found'));
    res.locals.resources = result;
    return next();
  }));
  router.patch('/:resource/:id', asyncController(async (req, res, next) => {
    if (get(config, `resources.${req.params.resource}.patch`) === false) return next();
    const defaultFn = get(config, `resources.${req.params.resource}.patch.default`);

    const { _id, ...patch } = req.body;
    if (!Object.keys(patch).length) return next(new HttpError.BadRequest('Missing body'));
    const result = await db
      .collection(req.params.resource)
      .findOne({ _id: get(req, 'moser.validation.id', req.params.id) });
    if (!result) return next(new HttpError.NotFound('Resource not found'));
    res.locals.resources = result;
    return next();
  }));
  router.delete('/:resource/:id', asyncController(async (req, res, next) => {
    if (get(config, `resources.${req.params.resource}.delete`) === false) return next();
    const result = await db
      .collection(req.params.resource)
      .findOne({ _id: req.params.id });
    if (!result) return next(new HttpError.NotFound('Resource not found'));
    res.locals.resources = result;
    return next();
  }));

  /**
   * Routes, Execute dynamic permissions
   */
  generateDynamicPermissionRoutes(config, router);


  /**
   * Add afterPermission middleware
   */
  addMiddleware('afterDinamicPermissions')(config, router);

  /**
   * this is the only route that is handled after the permission
   */
  router.get('/:resource', asyncController(async (req, res, next) => {
    if (get(config, `resources.${req.params.resource}.get`) === false) return next();

    const { $populate, $fill, $count } = req.query;
    const { filter, query } = req;

    if ($count) {
      return res.send({ count: await count(req.params.resource, query, filter) });
    }

    const result = ($populate || $fill)
      ? await findAndPopulate(req.params.resource, query, filter, req)
      : await find(req.params.resource, query, filter);

    res.locals.resources = result;
    return next();
  }));

  /**
   * Routes, Execute logic handlers
   */
  generateDoHandlers(config, router, db);

  /**
   * Routes, execute action
   */
  router.post('/:resource/', asyncController(async (req, res, next) => {
    if (get(config, `resources.${req.params.resource}.post`) === false) return next();

    await db
      .collection(req.params.resource)
      .insertOne(res.locals.resources);

    return next();
  }));
  router.put('/:resource/:id', asyncController(async (req, res, next) => {
    if (get(config, `resources.${req.params.resource}.put`) === false) return next();
    const defaultFn = get(config, `resources.${req.params.resource}.put.default`);
    const { _id, ...put } = req.body;

    const result = await db
      .collection(req.params.resource)
      .findOneAndReplace({ _id: get(req, 'moser.validation.id', req.params.id) }, put, {
        returnOriginal: false,
      });

    if (!result.value) return next(new HttpError.NotFound('Resource not found'));
    res.locals.resources = result.value;
    return next();
  }));
  router.patch('/:resource/:id', asyncController(async (req, res, next) => {
    if (get(config, `resources.${req.params.resource}.patch`) === false) return next();
    const defaultFn = get(config, `resources.${req.params.resource}.patch.default`);

    const { _id, ...patch } = req.body;
    if (!Object.keys(patch).length) return next(new HttpError.BadRequest('Missing body'));

    const result = await db
      .collection(req.params.resource)
      .findOneAndUpdate({ _id: get(req, 'moser.validation.id', req.params.id) }, { $set: patch }, {
        returnOriginal: false,
      });

    if (!result.value) return next(new HttpError.NotFound('Resource not found'));
    res.locals.resources = result.value;
    return next();
  }));
  router.delete('/:resource/:id', asyncController(async (req, res, next) => {
    if (get(config, `resources.${req.params.resource}.delete`) === false) return next();
    const softDelete = get(config, `resources.${req.params.resource}.softDelete`);
    if (softDelete) {
      await db
        .collection(req.params.resource)
        .updateOne(
          { _id: get(req, 'moser.validation.id', req.params.id) },
          { $set: { __d: true } },
        );
    } else {
      await db
        .collection(req.params.resource)
        .deleteOne({ _id: get(req, 'moser.validation.id', req.params.id) });
    }

    return res.sendStatus(204);
  }));


  addMiddleware('beforeOutput')(config, router);

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
      req.query.$select,
    ));
  });
  return router;
};
