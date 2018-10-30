const passport = require('passport');
const Local = require('passport-local').Strategy;
const { ObjectId } = require('mongodb');
const validate = require('express-validation');
const HttpError = require('http-errors');

const {
  mapValues, omit, pickBy, get,
} = require('lodash');
const { checkStaticPermissions, checkDynamicPermissions } = require('./middleware');
const { asyncController } = require('../routes/util');

/**
 * creates a set of passport-local strategies depending on the configuration
 * @param {Array} localAuthResources
 * @param {Object} param1
 * @param {DB} db
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

/**
 * Add middleware for jwt permissions
 * @param {Object} config config object
 * @param {Router} router express router
 */
exports.generateJwtPermissionRoutes = (config, router) => {
  const permissionResources = Object.keys(pickBy(config.resources, r => get(r, 'permissions')));
  const getPermissionResources = Object.keys(pickBy(config.resources, r => get(r, 'get.permissions')));
  const getIdPermissionResources = Object.keys(pickBy(config.resources, r => get(r, 'getId.permissions')));
  const postPermissionResources = Object.keys(pickBy(config.resources, r => get(r, 'post.permissions')));
  const patchPermissionResources = Object.keys(pickBy(config.resources, r => get(r, 'patch.permissions')));
  const putPermissionResources = Object.keys(pickBy(config.resources, r => get(r, 'put.permissions')));
  const deletePermissionResources = Object.keys(pickBy(config.resources, r => get(r, 'delete.permissions')));
  const { jwtSecret = 'secret' } = config;

  const addPermission = (paths, permissions, method) => {
    const checkJwt = require('express-jwt'); // eslint-disable-line global-require
    router[method](
      paths,
      checkJwt({ secret: jwtSecret }),
      checkStaticPermissions(permissions),
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

exports.generateDynamicPermissionRoutes = (config, router) => {
  const permissionResources = Object.keys(pickBy(config.resources, r => get(r, 'permissions')));
  const getPermissionResources = Object.keys(pickBy(config.resources, r => get(r, 'get.permissions')));
  const getIdPermissionResources = Object.keys(pickBy(config.resources, r => get(r, 'getId.permissions')));
  const postPermissionResources = Object.keys(pickBy(config.resources, r => get(r, 'post.permissions')));
  const patchPermissionResources = Object.keys(pickBy(config.resources, r => get(r, 'patch.permissions')));
  const putPermissionResources = Object.keys(pickBy(config.resources, r => get(r, 'put.permissions')));
  const deletePermissionResources = Object.keys(pickBy(config.resources, r => get(r, 'delete.permissions')));

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

exports.generateInputValidationRoutes = (config, router) => {
  const inResources = Object.keys(pickBy(config.resources, r => get(r, 'in')));
  const inGetResources = Object.keys(pickBy(config.resources, r => get(r, 'get.in')));
  const inGetIdResources = Object.keys(pickBy(config.resources, r => get(r, 'getId.in')));
  const inPostResources = Object.keys(pickBy(config.resources, r => get(r, 'post.in')));
  const inPutResources = Object.keys(pickBy(config.resources, r => get(r, 'put.in')));
  const inPatchResources = Object.keys(pickBy(config.resources, r => get(r, 'patch.in')));

  const addValidator = (paths, validationObject, method) => {
    router[method](
      paths,
      validate(validationObject),
    );
  };

  /**
   * general resource validation
   */
  inResources.forEach((resourceName) => {
    const validationObj = config.resources[resourceName].in;
    const {
      query, body, options,
    } = validationObj;
    addValidator([`/${resourceName}`, `/${resourceName}/:id`], { query, options }, 'get');
    addValidator([`/${resourceName}`], { body, options }, 'post');
    addValidator([`/${resourceName}/:id`], { body, options }, 'put');
    addValidator([`/${resourceName}/:id`], { body, options }, 'patch');
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
};

exports.generateOutputHandlers = (config, router) => {
  const outResources = Object.keys(pickBy(config.resources, r => get(r, 'out')));
  const outGetResources = Object.keys(pickBy(config.resources, r => get(r, 'get.out')));
  const outGetIdResources = Object.keys(pickBy(config.resources, r => get(r, 'getId.out')));
  const outPostResources = Object.keys(pickBy(config.resources, r => get(r, 'post.out')));
  const outPutResources = Object.keys(pickBy(config.resources, r => get(r, 'put.out')));
  const outPatchResources = Object.keys(pickBy(config.resources, r => get(r, 'patch.out')));

  const addHandler = (paths, validationObject, method) => {
    router[method](
      paths,
      validate(validationObject),
    );
  };

  /**
   * general resource validation
   */
  outResources.forEach((resourceName) => {
    const validationObj = config.resources[resourceName].in;
    const {
      query, body, options,
    } = validationObj;
    addHandler([`/${resourceName}`, `/${resourceName}/:id`], { query, options }, 'get');
    addHandler([`/${resourceName}`], { body, options }, 'post');
    addHandler([`/${resourceName}/:id`], { body, options }, 'put');
    addHandler([`/${resourceName}/:id`], { body, options }, 'patch');
  });
  /**
    * specific resource METHOD permissions
    */
  outGetResources.forEach((resourceName) => {
    const validationObj = config.resources[resourceName].get.in;
    addHandler([`/${resourceName}`], validationObj, 'get');
  });
  outGetIdResources.forEach((resourceName) => {
    const validationObj = config.resources[resourceName].getId.in;
    addHandler([`/${resourceName}/:id`], validationObj, 'get');
  });
  outPostResources.forEach((resourceName) => {
    const validationObj = config.resources[resourceName].post;
    addHandler([`/${resourceName}/`], validationObj, 'post');
  });
  outPatchResources.forEach((resourceName) => {
    const validationObj = config.resources[resourceName].patch.in;
    addHandler([`/${resourceName}/:id`], validationObj, 'patch');
  });
  outPutResources.forEach((resourceName) => {
    const validationObj = config.resources[resourceName].put.in;
    addHandler([`/${resourceName}/:id`], validationObj, 'put');
  });
};

exports.generateRestrictHandlers = (config, router) => {
  if (config.restrict) {
    const { resources } = config;
    if (!resources) throw new Error('config.resources Option is necessary when restrict is set to true');

    const allowedResources = Array.isArray(resources)
      ? resources
      : Object.keys(resources).filter(item => resources[item]);

    router.use(['/:resource', '/:resource/:id'], (req, res, next) => {
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

exports.generateNodemailerHandlers = (config, router) => {
  if (config.nodemailer) {
    const { resources, nodemailer } = config;
    if (!resources) throw new Error('config.resources Option is necessary when nodemailer is set to true');
    const Nodemailer = require('nodemailer'); // eslint-disable-line global-require
    const { htmlEmailTemplate } = require('../routes/util'); // eslint-disable-line global-require

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
