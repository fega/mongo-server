const {
  mapValues, mapKeys, get, capitalize, pickBy, flatten, uniq,
} = require('lodash');
const { plural, singular } = require('pluralize');


const produces = ['application/json'];
const securityItems = [];
// SECURITY
const getSecurity = (resourceConfig, requestType) => {
  const permissions = [
    ...get(resourceConfig, `${requestType}.permissions`) || [],
    ...get(resourceConfig, 'permissions') || [],
  ];
  if (permissions.length) {
    securityItems.push(...flatten(permissions));
    return {
      security: [{
        permissions: flatten(permissions),
      },
      ],
    };
  }
  return {};
};
// RESPONSES
const get200Responses = (key, resourceConfig, requestType) => {
  if (requestType === 'get') {
    return {
      description: 'successful operation',
      schema: {
        type: 'array',
        items: {
          $ref: `#/definitions/${singular(capitalize(key))}Output`,
        },
      },
    };
  }
  if (['post', 'getId', 'put', 'patch'].includes(requestType)) {
    return {
      description: 'successful operation',
      schema: {
        $ref: `#/definitions/${singular(capitalize(key))}Output`,
      },
    };
  }
  return undefined;
};
const get204Resposes = (key, resourceConfig, requestType) => {
  if (requestType === 'delete') {
    return {
      description: 'success, no body',
    };
  }
  return undefined;
};
const getResponses = (key, resourceConfig, requestType) => {
  const responses = {
    responses: {
      200: get200Responses(key, resourceConfig, requestType),
      400: {
        description: 'Validation failed',
      },
      403: {
        description: 'forbiden',
      },
      401: {
        description: 'unauthorized',
      },
      404: {
        description: 'Not found',
      },
      204: get204Resposes(key, resourceConfig, requestType),
    },
  };
  return responses;
};


// PARAMETERS
const getIdParameters = (key, resourceConfig, requestType) => {
  if (['getId', 'put', 'patch', 'delete'].includes(requestType)) {
    return [{
      name: 'id',
      in: 'path',
      description: `ID of ${singular(key)}`,
      required: true,
      type: 'string',
    }];
  }
  return [];
};
const getParameterDescription = (name, value) => {
  if (value) return value;
  if (name.includes('_id')) {
    return `a ${name.replace('_id', '')} ID`;
  }
  return undefined;
};
const getParameter = (name, described) => pickBy({
  name: 'body',
  in: 'body',
  schema: {
    $ref: `#/definitions/${singular(capitalize(name))}Input`,
  },
  // require: get(described, 'flags.presence'),
  // type: getParameterType(name, described),
  // enum: get(described, 'valids'),
  description: getParameterDescription(name, get(described, 'description')),
}, v => v);
const getBodyParameters = (key, resourceConfig, requestType) => {
  const described = get(resourceConfig, 'in.body');
  if (!described) return [];

  if (['post', 'put', 'patch'].includes(requestType)) {
    return [getParameter(key, resourceConfig)];
  }
  return [];
};
const getQueryParameters = (key, resourceConfig, requestType) => {
  if (requestType === 'get') {
    return [{
      name: '$page',
      in: 'query',
      description: "Resource pagination's page",
      type: 'integer',
      minimum: 0,
      default: 0,
    }, {
      name: '$limit',
      in: 'query',
      description: 'Quantity of results',
      type: 'integer',
      minimum: 1,
      default: 10,
    }, {
      name: '$sort',
      in: 'query',
      description: 'Sort by a field name',
      type: 'string',
    }, {
      name: '$order',
      in: 'query',
      description: 'Sort order',
      type: 'string',
      enum: ['asc', 'desc'],
    }, {
      name: '$populate',
      in: 'query',
      description: 'Populates a resource type with their childs, more info here https://github.com/fega/mongo-server#relationships',
      type: 'string',
    }, {
      name: '$fill',
      in: 'query',
      description: 'Populates a resource type with their parents, more info here https://github.com/fega/mongo-server#relationships',
      type: 'string',
    }, {
      name: '$select',
      in: 'query',
      description: 'Only returns the selected fields',
      type: 'string',
    }, {
      name: 'filters',
      in: 'query',
      description: 'filters a response you can use any valid resource field name as parameter name, more info: https://github.com/fega/mongo-server#filter',
      type: 'string',
    }];
  }
  if (requestType === 'delete') {
    return [];
  }
  return [{
    name: '$select',
    in: 'query',
    description: 'Only returns the selected fields',
    type: 'string',
  }];
};
const getParameters = (key, resourceConfig, requestType) => ({
  parameters: [
    ...getIdParameters(key, resourceConfig, requestType),
    ...getBodyParameters(key, resourceConfig, requestType),
    ...getQueryParameters(key, resourceConfig, requestType),
  ],
});

// AUTH ROUTES
const getLocalLoginPath = (resource, name) => `/auth/${plural(name)}/log-in`;
const getLocalLoginRoute = (resource, name) => ({
  post: {
    summary: `${capitalize(name)} resource Log In route`,

    tags: ['Auth'],
    parameters: [{
      name: resource.auth.local.passwordField,
      description: 'password field',
      in: 'body',
      type: 'string',
      required: true,
    }, {
      name: resource.auth.local.userField,
      description: 'username or email field',
      in: 'body',
      type: 'string',
      format: 'email',
      required: true,
    }],
    responses: {
      200: {
        description: 'User logged',
      },
    },
  },
});

const getLocalSignInPath = (resource, name) => `/auth/${plural(name)}/sign-up`;
const getLocalSignInRoute = (resource, name) => ({
  post: {
    summary: `${capitalize(name)} resource Create account route`,

    tags: ['Auth'],

    parameters: [{
      name: resource.auth.passwordField,
      description: 'password field',
      in: 'body',
      type: 'string',
      required: true,
    }, {
      name: resource.auth.usernameField,
      description: 'username or email field',
      in: 'body',
      type: 'string',
      format: 'email',
      required: true,
    }],
    responses: {
      200: {
        description: 'User logged',
      },
    },
  },
});

const getLocalAuthRoutes = (resources) => {
  const filtered = pickBy(resources, value => get(value, 'auth.local'));
  const loginRoutes = mapKeys(
    mapValues(filtered, getLocalSignInRoute),
    getLocalSignInPath,
  );
  const signInRoutes = mapKeys(
    mapValues(filtered, getLocalLoginRoute),
    getLocalLoginPath,
  );
  return { ...loginRoutes, ...signInRoutes };
};
const getMagicCodesRoutes = (resources) => {
  const filtered = pickBy(resources, value => get(value, 'auth.local'));
};

const getMagicLinksRoutes = () => {

};

const getPasswordRecoveryRoutes = () => {

};

// ROUTES
const getGetAndPostPathObject = (resource, name) => {
  const haveGet = get(resource, 'get');
  const havePost = get(resource, 'post');

  if (!haveGet && !havePost) return {};


  return {
    get: haveGet ? {
      tags: [name],
      produces,
      ...getSecurity(resource, 'get'),
      ...getResponses(name, getResponses, 'get'),
      ...getParameters(name, resource, 'get'),
    } : undefined,
    post: havePost ? {
      tags: [name],
      produces,
      ...getSecurity(resource, 'post'),
      ...getResponses(name, getResponses, 'post'),
      ...getParameters(name, resource, 'post'),
    } : undefined,
  };
};

const getGetIdPatchPutAndDeletePathObject = (resource, name) => {
  const haveGetId = get(resource, 'getId');
  const havePatch = get(resource, 'patch');
  const havePut = get(resource, 'put');
  const haveDelete = get(resource, 'put');

  return {
    get: haveGetId ? {
      tags: [name],
      produces,
      ...getSecurity(resource, 'getId'),
      ...getResponses(name, getResponses, 'getId'),
      ...getParameters(name, resource, 'getId'),
    } : undefined,

    patch: havePatch ? {
      tags: [name],
      produces,
      ...getSecurity(resource, 'patch'),
      ...getResponses(name, getResponses, 'patch'),
      ...getParameters(name, resource, 'patch'),
    } : undefined,


    put: havePut ? {
      tags: [name],
      produces,
      ...getSecurity(resource, 'put'),
      ...getResponses(name, getResponses, 'put'),
      ...getParameters(name, resource, 'put'),
    } : undefined,


    delete: haveDelete ? {
      tags: [name],
      produces,
      ...getSecurity(resource, 'delete'),
      ...getResponses(name, getResponses, 'delete'),
      ...getParameters(name, resource, 'delete'),
    } : undefined,
  };
};

const geAuthRoutes = resources => ({
  ...getLocalAuthRoutes(resources),
});

const getGetPath = (resource, name) => `/${plural(name)}`;
const getIdGetPath = (resource, name) => `/${plural(name)}/{id}`;
module.exports.generatePaths = (description) => {
  const { resources } = description;

  if (!resources) return {};

  const getPaths = mapKeys(
    mapValues(resources, getGetAndPostPathObject),
    getGetPath,
  );
  const getIdPaths = mapKeys(
    mapValues(resources, getGetIdPatchPutAndDeletePathObject),
    getIdGetPath,
  );
  const authPaths = geAuthRoutes(resources);
  return { ...getPaths, ...getIdPaths, ...authPaths };
};

const securityDefinitions = () => {
  const r = {};

  securityItems.forEach((name) => { r[name] = 'security definitions'; });

  return r;
};


module.exports.securityDefinitions = securityDefinitions;
