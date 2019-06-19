const passport = require('passport');
const Local = require('passport-local').Strategy;
const { ObjectId } = require('mongodb');
const validate = require('express-validation');
const HttpError = require('http-errors');

const {
  mapValues, omit, pickBy, get,
} = require('lodash');
const {
  checkStaticPermissions,
  checkDynamicPermissions,
  magicLinkCreateToken,
  magicLinkVerifyToken,
  magicLinkGetUserJwt,
  magicCodeCreateToken,
  magicCodeVerifyToken,
  populateUser,
} = require('./middleware');
const { asyncController } = require('../routes/util');

/**
 * creates a set of passport-local strategies depending on the configuration
 * @param {Array} localAuthResources
 * @param {Object} param1
 * @param {import('mongodb').Db} db
 */
const generateLocalStrategies = (localAuthResources, { jwtSecret = 'secret', resources }, db) => {
  const jwt = require('jsonwebtoken'); // eslint-disable-line global-require
  const bcrypt = require('bcryptjs'); // eslint-disable-line global-require
  mapValues(localAuthResources, (resourceName) => {
    const authObject = resources[resourceName].auth.local;

    if (Array.isArray(authObject)) {
      const [userFieldName, passFieldName, permissions] = authObject;
      passport.use(`local-${resourceName}`, new Local({
        usernameField: userFieldName,
        passwordField: passFieldName,
        session: false,
      }, async (user, pass, done) => {
        try {
          const resource = await db.collection(resourceName).findOne({
            [userFieldName]: user,
          });
          if (!resource) return done(null, null);
          const isValid = await bcrypt.compare(pass, resource[passFieldName]);
          if (isValid) {
            return done(null, {
              ...omit(resource, [passFieldName]),
              $token: await jwt
                .sign(
                  { resource: resourceName, _id: resource._id.toString(), permissions },
                  jwtSecret,
                ),
            });
          }
          return done(null, null);
        } catch (error) {
          return done(error);
        }
      }));
    }
  });
};
const pickFromResources = (config, selection) => Object
  .keys(pickBy(config.resources, r => get(r, selection)));

/**
 * Add middleware for jwt permissions
 * @param {Object} config config object
 * @param {import('express').Router} router express router
 */
exports.generateJwtPermissionRoutes = (config, router, db) => {
  const permissionResources = pickFromResources(config, 'permissions');
  const getPermissionResources = pickFromResources(config, 'get.permissions');
  const getIdPermissionResources = pickFromResources(config, 'getId.permissions');
  const postPermissionResources = pickFromResources(config, 'post.permissions');
  const patchPermissionResources = pickFromResources(config, 'patch.permissions');
  const putPermissionResources = pickFromResources(config, 'put.permissions');
  const deletePermissionResources = pickFromResources(config, 'delete.permissions');

  const { jwtSecret = 'secret' } = config;

  const addPermission = (resourceName, paths, permissions, method) => {
    const checkJwt = require('express-jwt'); // eslint-disable-line global-require
    router[method](
      paths,
      checkJwt({
        secret: jwtSecret, credentialsRequired: false,
      }),
      asyncController(populateUser(db, resourceName)),
      checkStaticPermissions(permissions),
    );
  };
  /**
   * general resource permissions
   */
  permissionResources.forEach((resourceName) => {
    const { permissions } = config.resources[resourceName];
    const methods = ['get', 'post', 'put', 'patch', 'delete'];
    methods.forEach(method => addPermission(resourceName, [`/${resourceName}`, `/${resourceName}/:id`], permissions, method));
  });
  /**
   * specific resource METHOD permissions
   */
  getPermissionResources.forEach((resourceName) => {
    const { permissions } = config.resources[resourceName].get;
    addPermission(resourceName, [`/${resourceName}`], permissions, 'get');
  });
  getIdPermissionResources.forEach((resourceName) => {
    const { permissions } = config.resources[resourceName].getId;
    addPermission(resourceName, [`/${resourceName}/:id`], permissions, 'get');
  });
  postPermissionResources.forEach((resourceName) => {
    const { permissions } = config.resources[resourceName].post;
    addPermission(resourceName, [`/${resourceName}/`], permissions, 'post');
  });
  patchPermissionResources.forEach((resourceName) => {
    const { permissions } = config.resources[resourceName].patch;
    addPermission(resourceName, [`/${resourceName}/:id`], permissions, 'patch');
  });
  putPermissionResources.forEach((resourceName) => {
    const { permissions } = config.resources[resourceName].put;
    addPermission(resourceName, [`/${resourceName}/:id`], permissions, 'put');
  });
  deletePermissionResources.forEach((resourceName) => {
    const { permissions } = config.resources[resourceName].delete;
    addPermission(resourceName, [`/${resourceName}/:id`], permissions, 'delete');
  });
};

exports.generateDynamicPermissionRoutes = (config, router) => {
  const permissionResources = pickFromResources(config, 'permissions');
  const getPermissionResources = pickFromResources(config, 'get.permissions');
  const getIdPermissionResources = pickFromResources(config, 'getId.permissions');
  const postPermissionResources = pickFromResources(config, 'post.permissions');
  const patchPermissionResources = pickFromResources(config, 'patch.permissions');
  const putPermissionResources = pickFromResources(config, 'put.permissions');
  const deletePermissionResources = pickFromResources(config, 'delete.permissions');

  const addPermission = (paths, permissions, method) => {
    router[method](
      paths,
      checkDynamicPermissions(permissions, config.permissions, config.filters),
    );
  };
  /**
   * general resource permissions
   */
  permissionResources.forEach((resourceName) => {
    const { permissions } = config.resources[resourceName];
    const methods = ['get', 'post', 'put', 'patch', 'delete'];
    methods.forEach(method => addPermission([`/${resourceName}`, `/${resourceName}/:id`], permissions, method));
  });
  /**
   * specific resource METHOD permissions
   */
  getPermissionResources.forEach((resourceName) => {
    const { permissions } = config.resources[resourceName].get;
    addPermission([`/${resourceName}`], permissions, 'get');
  });
  getIdPermissionResources.forEach((resourceName) => {
    const { permissions } = config.resources[resourceName].getId;
    addPermission([`/${resourceName}/:id`], permissions, 'get');
  });
  postPermissionResources.forEach((resourceName) => {
    const { permissions } = config.resources[resourceName].post;
    addPermission([`/${resourceName}/`], permissions, 'post');
  });
  patchPermissionResources.forEach((resourceName) => {
    const { permissions } = config.resources[resourceName].patch;
    addPermission([`/${resourceName}/:id`], permissions, 'patch');
  });
  putPermissionResources.forEach((resourceName) => {
    const { permissions } = config.resources[resourceName].put;
    addPermission([`/${resourceName}/:id`], permissions, 'put');
  });
  deletePermissionResources.forEach((resourceName) => {
    const { permissions } = config.resources[resourceName].delete;
    addPermission([`/${resourceName}/:id`], permissions, 'delete');
  });
};
/**
 * Fix param id validation problem
 */
const copyParamValidation = (req, res, next) => {
  req.moser = { validation: { id: req.params.id } };
  next();
};

exports.generateInputValidationRoutes = (config, router) => {
  const inResources = Object.keys(pickBy(config.resources, r => get(r, 'in')));
  const inGetResources = Object.keys(pickBy(config.resources, r => get(r, 'get.in')));
  const inGetIdResources = Object.keys(pickBy(config.resources, r => get(r, 'getId.in')));
  const inPostResources = Object.keys(pickBy(config.resources, r => get(r, 'post.in')));
  const inPutResources = Object.keys(pickBy(config.resources, r => get(r, 'put.in')));
  const inPatchResources = Object.keys(pickBy(config.resources, r => get(r, 'patch.in')));
  const inDeleteResources = Object.keys(pickBy(config.resources, r => get(r, 'delete.in')));

  const addValidator = (paths, validationObject, method) => {
    router[method](
      paths,
      validate(validationObject),
      copyParamValidation,
    );
  };

  /**
   * general resource validation
   */
  inResources.forEach((resourceName) => {
    const validationObj = config.resources[resourceName].in;
    const {
      query, body, options, params,
    } = validationObj;
    addValidator([`/${resourceName}`], { query, options }, 'get');
    addValidator([`/${resourceName}/:id`], { query, options, params }, 'get');
    addValidator([`/${resourceName}`], { body, options }, 'post');
    addValidator([`/${resourceName}/:id`], { body, options, params }, 'put');
    addValidator([`/${resourceName}/:id`], { body, options, params }, 'patch');
    addValidator([`/${resourceName}/:id`], { params }, 'delete');
  });
  /**
    * specific resource METHOD permissions
    */
  inGetResources.forEach((resourceName) => {
    const validationObj = config.resources[resourceName].get.in;
    addValidator([`/${resourceName}`], validationObj, 'get');
  });
  inGetIdResources.forEach((resourceName) => {
    const validationObj = config.resources[resourceName].getId.in;
    addValidator([`/${resourceName}/:id`], validationObj, 'get');
  });
  inPostResources.forEach((resourceName) => {
    const validationObj = config.resources[resourceName].post;
    addValidator([`/${resourceName}/`], validationObj, 'post');
  });
  inPatchResources.forEach((resourceName) => {
    const validationObj = config.resources[resourceName].patch.in;
    addValidator([`/${resourceName}/:id`], validationObj, 'patch');
  });
  inPutResources.forEach((resourceName) => {
    const validationObj = config.resources[resourceName].put.in;
    addValidator([`/${resourceName}/:id`], validationObj, 'put');
  });
  inDeleteResources.forEach((resourceName) => {
    const validationObj = config.resources[resourceName].put.in;
    addValidator([`/${resourceName}/:id`], validationObj, 'delete');
  });
};

exports.generateRestrictHandlers = (config, router) => {
  if (config.restrict) {
    const { resources } = config;
    if (!resources) throw new Error('config.resources Option is necessary when restrict is set to true');
    const authResources = Object.keys(pickBy(resources, r => get(r, 'auth')));
    const authEnabled = !!authResources.length;
    const allowedResources = Array.isArray(resources)
      ? resources
      : Object.keys(resources).filter(item => resources[item]);

    router.use(['/:resource', '/:resource/:id'], (req, res, next) => {
      if (req.params.resource === 'auth' && authEnabled) return next();
      if (allowedResources.includes(req.params.resource)) return next();
      throw new HttpError.NotFound('Not found');
    });
  }
};

exports.generateAuthLocalHandlers = (config, router, db) => {
  if (config.resources) {
    const { resources, jwtSecret = 'secret', bcryptRounds = 1 } = config;
    const jwt = require('jsonwebtoken'); // eslint-disable-line global-require
    const bcrypt = require('bcryptjs'); // eslint-disable-line global-require

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

          const _id = new ObjectId().toString();

          const $token = await jwt.sign(
            {
              [userField]: userValue, resource: req.params.resource, permissions, _id,
            },
            jwtSecret,
          );
          const insert = {
            ...req.body,
            ...permissions ? { permissions } : {},
            [passField]: await bcrypt.hash(passValue, bcryptRounds),
            _id,
          };
          await db.collection(req.params.resource).insertOne(insert);

          return res.status(200).send({
            ...omit(insert, passValue),
            $token,
          });
        } catch (error) {
          return next(error);
        }
      });
      /**
       * log-in middleware
       */
      router.use(passport.initialize());
      generateLocalStrategies(authLocalResources, config, db);
      authLocalResources.forEach((resourceName) => {
        router.post(
          `/auth/${resourceName}/log-in`,
          passport.authenticate(`local-${resourceName}`, { session: false }),
          (req, res) => res.json(req.user),
        );
      });
    }
  }
};

exports.generateMagicLinkHandlers = (config, router, db) => {
  if (config.resources) {
    const { resources } = config;
    const magicResources = Object.keys(pickBy(resources, r => get(r, 'auth.magicLink')));
    if (magicResources.length) {
      const Nodemailer = require('nodemailer'); // eslint-disable-line global-require
      const transport = Nodemailer.createTransport(config.nodemailer);
      if (!config.nodemailer) throw new Error('Nodemailer configuration is required for magic-links auth');
      /**
       * first endpoint
       */
      router.post('/auth/:resource/magic-link',
        asyncController(magicLinkCreateToken(config, db, magicResources, transport)));
      /**
       * Verify endpoint
       */
      router.get('/auth/:resource/magic-link/:token',
        asyncController(magicLinkVerifyToken(config, db, magicResources)));
      /**
       * Get Jwt endpoint
       */
      router.get('/auth/:resource/magic-token/:token',
        asyncController(magicLinkGetUserJwt(config, db, magicResources)));
    }
  }
};

exports.generateMagicCodeHandlers = (config, router, db) => {
  if (config.resources) {
    const { resources } = config;
    const magicResources = Object.keys(pickBy(resources, r => get(r, 'auth.magicCode')));
    if (magicResources.length) {
      const Nodemailer = require('nodemailer'); // eslint-disable-line global-require
      const transport = Nodemailer.createTransport(config.nodemailer);
      if (!config.nodemailer) throw new Error('Nodemailer configuration is required for magic-code auth');
      /**
       * first endpoint
       */
      router.post('/auth/:resource/magic-code',
        asyncController(magicCodeCreateToken(config, db, magicResources, transport)));
      /**
       * Verify endpoint
       */
      router.get('/auth/:resource/magic-code/:email/:token',
        asyncController(magicCodeVerifyToken(config, db, magicResources)));
    }
  }
};

exports.generateNodemailerHandlers = (config, router) => {
  if (config.nodemailer) {
    const { resources, nodemailer } = config;
    if (!resources) throw new Error('config.resources Option is necessary when nodemailer is set to true');
    const Nodemailer = require('nodemailer'); // eslint-disable-line global-require
    const htmlEmailTemplate = require('./templates/alert'); // eslint-disable-line global-require

    const transport = Nodemailer.createTransport(nodemailer);

    const emailResources = Array.isArray(resources)
      ? []
      : Object.keys(resources).filter(item => get(resources[item], 'email'));
    router.post(['/:resource', '/:resource/:id'], (req, res, next) => {
      if (!emailResources.includes(req.params.resource)) return next();
      const resource = resources[req.params.resource];
      return transport.sendMail({
        from: 'email@email.com',
        to: resource.email.to,
        text: 'Text',
        html: htmlEmailTemplate(req.path, req.body),
        title: resource.email.title || `An email from moserApi POST /${req.params.resource}`,
      }).then(() => next()).catch(next);
    });
  }
};

exports.generateDoHandlers = (config, router, db) => {
  const GetHandlers = Object.keys(pickBy(config.resources, r => get(r, 'get.do')));
  const GetIdHandlers = Object.keys(pickBy(config.resources, r => get(r, 'getId.do')));
  const PostHandlers = Object.keys(pickBy(config.resources, r => get(r, 'post.do')));
  const PutHandlers = Object.keys(pickBy(config.resources, r => get(r, 'put.do')));
  const PatchHandlers = Object.keys(pickBy(config.resources, r => get(r, 'patch.do')));
  const DeleteHandlers = Object.keys(pickBy(config.resources, r => get(r, 'delete.do')));

  const addHandler = (path, method, handler) => {
    router[method](
      path,
      asyncController(async (req, res, next) => {
        await handler({
          req,
          res,
          next,
          config,
          db,
          user: req.user,
          resources: res.locals.resources,
          HttpError,
        });
      }),
    );
  };

  PostHandlers.map(resourceName => addHandler(
    `/${resourceName}/`,
    'post',
    config.resources[resourceName].post.do,
  ));

  GetHandlers.map(resourceName => addHandler(
    `/${resourceName}/`,
    'get',
    config.resources[resourceName].get.do,
  ));

  GetIdHandlers.map(resourceName => addHandler(
    `/${resourceName}/:id`,
    'get',
    config.resources[resourceName].getId.do,
  ));

  PutHandlers.map(resourceName => addHandler(
    `/${resourceName}/:id`,
    'put',
    config.resources[resourceName].put.do,
  ));
  PatchHandlers.map(resourceName => addHandler(
    `/${resourceName}/:id`,
    'patch',
    config.resources[resourceName].patch.do,
  ));
  DeleteHandlers.map(resourceName => addHandler(
    `/${resourceName}/:id`,
    'delete',
    config.resources[resourceName].delete.do,
  ));
};

exports.generateCustomPermissionHandlers = () => {

};

exports.generateCustomFilterHandlers = () => {

};

exports.addMiddleware = type => (config, router) => {
  const MResources = pickFromResources(config, `middleware.${type}`);
  const getMResources = pickFromResources(config, `get.middleware.${type}`);
  const postMResources = pickFromResources(config, `post.middleware.${type}`);
  const getIdMResources = pickFromResources(config, `getId.middleware.${type}`);
  const patchMResources = pickFromResources(config, `patch.middleware.${type}`);
  const putMResources = pickFromResources(config, `put.middleware.${type}`);
  const deleteMResources = pickFromResources(config, `delete.middleware.${type}`);

  const addMiddlewareItem = (path, method, middleware) => {
    router[method](path, middleware);
  };

  MResources.map(resourceName => addMiddlewareItem(
    `/${resourceName}/`,
    'use',
    config.resources[resourceName].middleware[type],
  ));
  getMResources.map(resourceName => addMiddlewareItem(
    `/${resourceName}/`,
    'get',
    config.resources[resourceName].get.middleware[type],
  ));
  postMResources.map(resourceName => addMiddlewareItem(
    `/${resourceName}/`,
    'post',
    config.resources[resourceName].post.middleware[type],
  ));
  getIdMResources.map(resourceName => addMiddlewareItem(
    `/${resourceName}/:id`,
    'get',
    config.resources[resourceName].getId.middleware[type],
  ));
  patchMResources.map(resourceName => addMiddlewareItem(
    `/${resourceName}/:id`,
    'patch',
    config.resources[resourceName].patch.middleware[type],
  ));
  putMResources.map(resourceName => addMiddlewareItem(
    `/${resourceName}/:id`,
    'put',
    config.resources[resourceName].put.middleware[type],
  ));
  deleteMResources.map(resourceName => addMiddlewareItem(
    `/${resourceName}/:id`,
    'delete',
    config.resources[resourceName].delete.middleware[type],
  ));
};
