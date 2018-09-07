const passport = require('passport');
const Local = require('passport-local').Strategy;
const checkJwt = require('express-jwt');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const guard = require('express-jwt-permissions')();
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


exports.generateJwtPermissionRoutes = (config, router) => {
  const permissionResources = Object.keys(pickBy(config.resources, r => get(r, 'permissions')));
  const getPermissionResources = Object.keys(pickBy(config.resources, r => get(r, 'get.permissions')));
  const getIdPermissionResources = Object.keys(pickBy(config.resources, r => get(r, 'getId.permissions')));
  const postPermissionResources = Object.keys(pickBy(config.resources, r => get(r, 'post.permissions')));
  const patchPermissionResources = Object.keys(pickBy(config.resources, r => get(r, 'patch.permissions')));
  const putPermissionResources = Object.keys(pickBy(config.resources, r => get(r, 'put.permissions')));
  const deletePermissionResources = Object.keys(pickBy(config.resources, r => get(r, 'delete.permissions')));
  const { jwtSecret = 'secret' } = config;

  const addPermission = (endpoints, permissions, method) => {
    router[method](
      endpoints,
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
