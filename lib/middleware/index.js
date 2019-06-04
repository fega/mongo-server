const { isString } = require('lodash');
const HttpError = require('http-errors');
const jwt = require('jsonwebtoken');
const assert = require('assert');
const {
  magicLinkCreateToken,
  magicLinkVerifyToken,
  magicLinkGetUserJwt,
} = require('./magicLinks');
const { magicCodeCreateToken, magicCodeVerifyToken } = require('./magicCode');
const { populateUser } = require('./localAuth');

const { isArray } = Array;
const isSpecial = permission => permission.startsWith('$');
const isNormal = permission => !isSpecial(permission);
const isDeepEqual = (a, b) => {
  try {
    assert.deepEqual(a, b);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Allows the use of express async handlers
 * @param {import('express').RequestHandler} asyncFn Express handler
 */
const asyncController = asyncFn => (req, res, next) => Promise
  .resolve(asyncFn(req, res, next)).catch(next);

/**
 * if permissions is \[\[]] or [] change them to null to allow any user to pass
 * @param {*} permissions
 */
const cleanDynamicPermission = (permissions) => {
  if (isDeepEqual(permissions, []) || isDeepEqual(permissions, [[]])) return [];
  return permissions;
};
/**
 * Normalizes the permissions to be processed in  checkDynamicPermissions middleware
 * @param {array} permissions An array with permissions object
 * @returns {DynamicPermissionsArray|null} normalized permissions array
 */
const getDynamicPermissions = (permissions) => {
  /**
   * edge cases
   */
  if (!permissions) return null;
  const isStr = isString(permissions);
  const isArr = isArray(permissions);
  if (!isStr && !isArr) throw new Error(`Permission parameter ${permissions} is not allowed`);
  if (isStr) return cleanDynamicPermission([[permissions]]);
  if (permissions.every(isString)) return cleanDynamicPermission([permissions]);

  /**
   * process
   */
  const _permissions = permissions.map((v) => {
    if (isString(v)) return [v];
    if (isArray(v)) return v;
    throw new Error(`Permission item ${permissions} is not allowed`);
  });
  return cleanDynamicPermission(_permissions);
};

/**
 * Normalizes the permissions to be processed in  checkStaticPermissions middleware
 * @param {array} permissions An array with permissions
 * @returns {StaticPermissionsArray} normalized permissions array
 */
const getStaticPermissions = (permissions) => {
  const processed = getDynamicPermissions(permissions)
    .map(arr => arr
      .filter(isNormal));

  const r = processed.some(arr => !arr.length) ? null : processed;

  return r;
};

/**
 * A simpler and customized version of express-jwt-permissions
 * @param {array|string} permissions Route permissions
 * @returns {Function} express middleware
 * @see https://www.npmjs.com/package/express-jwt-permissions
 */
const checkStaticPermissions = (permissions) => {
  const p = getStaticPermissions(permissions);

  return (req, res, next) => {
    if (p === null || isDeepEqual(p, [])) return next();
    if (p && !req.user) return next(new HttpError.Unauthorized());

    const { permissions: userPermissions = [] } = req.user;
    const isSubset = (big, little) => !little.some(val => big.indexOf(val) === -1);
    const pass = p.some(perArr => isSubset(userPermissions, perArr));
    return pass ? next() : next(new HttpError.Forbidden());
  };
};

/**
 * A an specialized version of express-jwt-permissions
 * @param {array|string} permissions Route permissions
 * @returns {Function} express middleware
 * @see https://www.npmjs.com/package/express-jwt-permissions
 */
const checkDynamicPermissions = (permissions, specialPermissions = {}, filters = {}) => {
  const p = getDynamicPermissions(permissions);
  return (req, res, next) => {
    /**
     * Edge cases
     */
    if (p === null || isDeepEqual(p, [])) return next();
    if (p && !req.user) return next(new HttpError.Unauthorized());
    const { permissions: userPermissions = [] } = req.user;
    const permissionParameter = {
      req,
      res,
      next,
      HttpError,
      user: req.user,
      resources: res.locals.resources,
    };
    /**
     * Dynamic Check
     */
    const pass = p.some((permissionArr) => {
      const decision = permissionArr.map((str) => {
        if (isSpecial(str)) {
          // if the filter is defined but the permission isn't let it pass
          if (!specialPermissions[str] && filters[str]) {
            const filter = filters[str](permissionParameter);
            req.filter = req.filter ? { ...req.filter, ...filter } : { ...filter };
            return true;
          }
          // if the route is GET /:resource execute the filter
          if (filters[str] && req.method === 'GET' && !req.params.id) {
            const filter = filters[str](permissionParameter);
            req.filter = req.filter ? { ...req.filter, ...filter } : { ...filter };
            return true;
          }

          return specialPermissions[str](permissionParameter);
        }
        return userPermissions.includes(str);
      });
      return decision.every(v => v);
    });
    return pass ? next() : next(new HttpError.Forbidden());
  };
};

/**
 * Email verification middleware
 */
const emailVerify = (config, db) => {
  const { fn, resourceName, secret = 'secret' } = config;
  return asyncController(async (req, res, next) => {
    /**
     * Verify the token
     */
    const token = await jwt.verify(req.params.token, secret);
    const { _id } = token;

    /**
     * Verify user
     */
    const user = await db.collection(resourceName).find({ _id });
    if (!user) throw new HttpError.NotFound('Not found');
    if (user.permissions && user.permissions.includes('email:verified')) {
      throw new HttpError.BadRequest('Already verified');
    }

    /**
     * Set email:verified permission
     */
    db.collection(resourceName).findOneAndUpdate({ _id }, { $addToSet: { permissions: 'email:verified' } });

    /**
     * custom logic
     */
    if (fn) {
      await fn({
        req, res, next, HttpError, user, db,
      });
    }

    /**
     * return if response wasn't send in custom logic
     */
    if (!res._headerSent) {
      return next(200);
    }
    return null;
  });
};

/**
 * Send email verification
 */
const sendEmailVerify = () => {

};

module.exports = {
  getDynamicPermissions,
  getStaticPermissions,
  checkStaticPermissions,
  checkDynamicPermissions,
  asyncController,
  emailVerify,
  sendEmailVerify,
  magicLinkCreateToken,
  magicLinkVerifyToken,
  magicLinkGetUserJwt,
  magicCodeCreateToken,
  magicCodeVerifyToken,
  populateUser,
};
