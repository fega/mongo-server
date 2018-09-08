const passport = require('passport');
const Local = require('passport-local').Strategy;
const checkJwt = require('express-jwt');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const guard = require('express-jwt-permissions')();
const validate = require('express-validation');

const {
  mapValues, omit, pickBy, get,
} = require('lodash');

/**
 * creates a set of passport-local strategies depending on the configuration
 * @param {Array} localAuthResources
 * @param {Object} param1
 * @param {DB} db
 */
exports.generateLocalStrategies = (localAuthResources, { jwtSecret = 'secret', resources }, db) => {
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
 * Add middlewarer for jwt permissions
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
    router[method](
      paths,
      checkJwt({ secret: jwtSecret }),
      guard.check(permissions),
    );
  };
  /**
   * general resource permissions
   */
  permissionResources.map((resourceName) => {
    const { permissions } = config.resources[resourceName];
    const methods = ['get', 'post', 'put', 'patch', 'delete'];
    methods.forEach(method => addPermission([`/${resourceName}`, `/${resourceName}/:id`], permissions, method));
  });
  /**
   * specific resource METHOD permissions
   */
  getPermissionResources.map((resourceName) => {
    const { permissions } = config.resources[resourceName].get;
    addPermission([`/${resourceName}`], permissions, 'get');
  });
  getIdPermissionResources.map((resourceName) => {
    const { permissions } = config.resources[resourceName].getId;
    addPermission([`/${resourceName}/:id`], permissions, 'get');
  });
  postPermissionResources.map((resourceName) => {
    const { permissions } = config.resources[resourceName].post;
    addPermission([`/${resourceName}/`], permissions, 'post');
  });
  patchPermissionResources.map((resourceName) => {
    const { permissions } = config.resources[resourceName].patch;
    addPermission([`/${resourceName}/:id`], permissions, 'patch');
  });
  putPermissionResources.map((resourceName) => {
    const { permissions } = config.resources[resourceName].put;
    addPermission([`/${resourceName}/:id`], permissions, 'put');
  });
  deletePermissionResources.map((resourceName) => {
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
  inResources.map((resourceName) => {
    const validationObj = config.resources[resourceName].in;
    const {
      query, body, params, options,
    } = validationObj;
    addValidator([`/${resourceName}`, `/${resourceName}/:id`], { query, options }, 'get');
    addValidator([`/${resourceName}`], { body, options }, 'post');
    addValidator([`/${resourceName}/:id`], { body, options }, 'put');
    addValidator([`/${resourceName}/:id`], { body, options }, 'patch');
  });
  /**
    * specific resource METHOD permissions
    */
  inGetResources.map((resourceName) => {
    const validationObj = config.resources[resourceName].get.in;
    addValidator([`/${resourceName}`], validationObj, 'get');
  });
  inGetIdResources.map((resourceName) => {
    const validationObj = config.resources[resourceName].getId.in;
    addValidator([`/${resourceName}/:id`], validationObj, 'get');
  });
  inPostResources.map((resourceName) => {
    const validationObj = config.resources[resourceName].post;
    addValidator([`/${resourceName}/`], validationObj, 'post');
  });
  inPatchResources.map((resourceName) => {
    const validationObj = config.resources[resourceName].patch.in;
    addValidator([`/${resourceName}/:id`], validationObj, 'patch');
  });
  inPutResources.map((resourceName) => {
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
  const outPatchResources = Object.keys(pickBy(config.resources, r => get(r, 'patch.in')));

  const addHandler = (paths, validationObject, method) => {
    router[method](
      paths,
      validate(validationObject),
    );
  };

  /**
   * general resource validation
   */
  outResources.map((resourceName) => {
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
  outGetResources.map((resourceName) => {
    const validationObj = config.resources[resourceName].get.in;
    addHandler([`/${resourceName}`], validationObj, 'get');
  });
  outGetIdResources.map((resourceName) => {
    const validationObj = config.resources[resourceName].getId.in;
    addHandler([`/${resourceName}/:id`], validationObj, 'get');
  });
  outPostResources.map((resourceName) => {
    const validationObj = config.resources[resourceName].post;
    addHandler([`/${resourceName}/`], validationObj, 'post');
  });
  outPatchResources.map((resourceName) => {
    const validationObj = config.resources[resourceName].patch.in;
    addHandler([`/${resourceName}/:id`], validationObj, 'patch');
  });
  outPutResources.map((resourceName) => {
    const validationObj = config.resources[resourceName].put.in;
    addHandler([`/${resourceName}/:id`], validationObj, 'put');
  });
};

exports.outputTreeGeneratorMiddleware = () => {

};

exports.outputMiddleware = () => {

};
