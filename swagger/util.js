const {
  mapValues, mapKeys, capitalize, clone, isObject, get,
} = require('lodash');
const {
  pickBy, pipe, map, pick,
} = require('ramda');
const { singular } = require('pluralize');
const { describe } = require('loy');
const Joi = require('joi');

const { assign } = Object;
const truthy = v => !!v;

exports.generatePaths = (config) => {
  const { resources } = config;
  const endpoints = mapValues(resources, (value, key) => ({
    get: generateGet(key, value),
    post: generatePost(key, value),
  }));
  const idEndpoints = mapValues(resources, (value, key) => ({
    get: generateGetId(key, value),
    put: generatePut(key, value),
    patch: generatePatch(key, value),
    delete: generateDelete(key, value),
  }));
  const r = mapKeys(endpoints, (value, key) => `/${key}`);
  const r2 = mapKeys(idEndpoints, (value, key) => `/${key}/{id}`);
  const r3 = {
    '/auth/users/magic-link': {
      post: {
        summary: 'Use this url to send an email confirmation',

        tags: ['Auth'],

        parameters: [{
          name: 'email',
          in: 'body',
          type: 'string',
          format: 'email',
          required: true,
        }],
        responses: {
          200: {
            description: 'email sent',
            schema: {
              $ref: '#/definitions/PostMagicLink',
            },
          },
          429: {
            description: 'Max amount of active tokens reached',
          },
        },
      },
    },
    '/auth/users/magic-link/:token': {
      get: {
        summary: 'Use this token to confirm an email',
        tags: ['Auth'],
        parameters: [{
          name: 'token',
          in: 'path',
          type: 'string',
          format: 'token',
          required: true,
        }],
        responses: {
          200: {
            description: 'confirmed',
          },
          404: {
            description: 'Not found',
          },
          400: {
            description: 'Something failed on validation',
          },
        },
      },
    },
    '/auth/users/magic-token/:searchToken': {
      get: {
        summary: 'After confirmed use this endpoint to retrieve a JWT token once',

        tags: ['Auth'],
        parameters: [{
          name: 'token',
          in: 'path',
          type: 'string',
          format: 'token',
          required: true,
        }],
        responses: {
          200: {
            description: 'token generated',
            schema: {
              $ref: '#/definitions/GetMagicToken',
            },
          },
          404: {
            description: 'Not found',
          },
          400: {
            description: 'Something failed on validation',
          },
        },
      },
    },
  };
  return { ...r, ...r2, ...r3 };
};

exports.generateDefinitions = (config) => {
  const { resources } = config;
  const r = mapKeys(mapValues(resources, (v, k) => getDefinition(k, v)), (v, k) => `${capitalize(singular(k))}Output`);
  return {
    ...r,
    PostMagicLink: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'search token',
        },
      },
    },
    GetMagicToken: {
      type: 'object',
      properties: {
        $token: {
          type: 'string',
          description: 'User JWT token',
        },
      },
    },
  };
};

const extraDescriptions = (description, key) => {
  const copy = clone(description);

  if (key.endsWith('_id') && !description.description) {
    copy.description = `A ${singular(key.replace('_id', ''))} Id`;
  }
  if (key.endsWith('_ids') && !description.description) {
    copy.description = `An array of ${singular(key.replace('_ids', ''))} Ids`;
  }
  if (key === 'updatedAt' && !description.description) {
    copy.description = 'Date of latest update of resource';
  }
  if (key === 'createdAt' && !description.description) {
    copy.description = 'Creation date of resource';
  }
  if (key === '_id' && !description.description) {
    copy.description = 'Resource Id';
  }
  return copy;
};

const generateExtraDescriptions = (outObj) => {
  const out = clone(outObj);
  Object.keys(outObj).forEach((key) => {
    out[key] = extraDescriptions(out[key], key);
  });
  return out;
};

const unrollTypeArray = (outObj) => {
  try {
    const out = clone(outObj);
    Object.keys(outObj).forEach((key) => {
      out[key].type = (Array.isArray(out[key].type) ? out[key].type[0] : out[key].type) || 'string';
    });
    return out;
  } catch (error) {
    return outObj;
  }
};

const completeOutWithIn = (name, outObj, ins) => {
  const mixin = get(ins, 'in.body.children');
  if (!mixin) return outObj;

  const out = clone(outObj);
  Object.keys(outObj).forEach((key) => {
    out[key] = Object.assign({}, mixin[key], out[key]);
  });
  return out;
};

const pickRootProperties = pick(['resources', 'root', 'port', 'host', 'static', 'staticRoot', 'pagination', 'restricted', 'appName', 'admin']);
const pickEndpointProperties = pick(['get', 'getId', 'put', 'patch', 'delete', 'post']);
const describeOut = (resource, name, ins) => {
  if (!resource.out) return {};
  const preOut = describe(resource.out);
  const preOut2 = generateExtraDescriptions(preOut);
  const preOut3 = unrollTypeArray(preOut2);
  const out = completeOutWithIn(name, preOut3, ins);
  return { out };
};
const describeEndpoint = (resource) => {
  if (resource === true) {
    return {};
  }

  if (Array.isArray(resource)) {
    return {
      permissions: resource,
    };
  }
  if (isObject(resource)) {
    const result = {};
    if (resource.permissions) result.permissions = resource.permissions;
    return result;
  }
};

const describeAuth = (resource) => {
  if (!resource.auth) return {};

  const auth = {};

  if (resource.auth.local) {
    auth.local = {
      userField: resource.auth.local[0],
      passwordField: resource.auth.local[1],
    };
  }
  if (resource.auth.magicLink) {
    auth.magicLink = {
      emailField: resource.auth.magicLink.emailField || 'email',
    };
  }
  if (resource.auth.magicCode) {
    auth.magicCode = {
      emailField: resource.auth.magicCode.emailField || 'email',
    };
  }
  return { auth };
};

const describeIn = (resource) => {
  if (!resource.in) return {};

  const $in = {};

  if (resource.in.body) {
    $in.body = Joi.describe(resource.in.body);
  }
  if (resource.in.query) {
    $in.query = Joi.describe(resource.in.query);
  }
  if (resource.in.params) {
    $in.params = Joi.describe(resource.in.params);
  }
  return { in: $in };
};

const describePermissions = (resource) => {
  if (resource.permissions) {
    return { permissions: resource.permissions };
  }
  return {};
};


const describeResource = (resource, name) => {
  const _resource = Object.assign({}, {
    get: {},
    getId: {},
    put: {},
    patch: {},
    delete: {},
  }, resource);
  const methods = pipe(
    pickBy(truthy),
    pickEndpointProperties,
    map(describeEndpoint),
  )(_resource);

  const ins = describeIn(resource);
  const out = describeOut(resource, name, ins);
  const auth = describeAuth(resource);
  const permissions = describePermissions(resource);
  return {
    ...methods,
    ...out,
    ...auth,
    ...ins,
    ...permissions,
    ...resource.description ? { description: resource.description } : {},
    ...resource.admin ? { admin: resource.admin } : {},
  };
};

const describeResources = config => ((!config.resources)
  ? config
  : assign(config, {
    resources: pipe(
      pickBy(truthy),
      map(describeResource),
    )(config.resources),
  }));

/**
 * Generates a mongo server description
 * @param {object} config Moser Object
 */
exports.describeServer = (config) => {
  const result = pipe(pickRootProperties, describeResources)(config);
  return result;
};

/**
 * Generates Swagger tags
 * @param {object} config Moser Object
 */
exports.generateTags = (config) => {
  if (!config.resources) return [];
  const resources = Object.keys(config.resources);
  // const r = [];
  const r = resources.map(resource => ({
    name: resource,
    description: config.resources[resource].description || `${capitalize(resource)} endpoints`,
  }));
  const haveAuth = resources.some(resource => get(config.resources[resource], 'auth'));
  if (haveAuth) {
    r.push({
      name: 'Auth',
      description: 'Authorization and authentication endpoints',
    });
  }
  return r;
};


const generateLocalAuthDefinitions = () => {

};


/**
 * Generates security definitions
 */
exports.generateSecurityDefinitions = (config) => {
  const securityDefinitions = {
    PostMagicLink: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'search token',
        },
      },
    },
    GetMagicToken: {
      type: 'object',
      properties: {
        $token: {
          type: 'string',
          description: 'User JWT token',
        },
      },
    },
  };
};
