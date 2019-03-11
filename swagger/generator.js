const swaggerUi = require('swagger-ui-express');
const { generateTags, describeServer } = require('./util');
const generateDefinitions = require('./definitions');
const { generatePaths, securityDefinitions } = require('./paths');
const { generateSecurityDefinitions } = require('./security');

const swagger = (config) => {
  const description = describeServer(config);
  const result = {
    swagger: '2.0',
    info: {
      // description: config.description || 'Rest api',
      version: config.version || '1.0.0',
      title: config.appName || 'Moser',
      host: config.host || 'http://localhost:3000',
      basePath: config.root || '/',
    },
    schemes: [
      'https',
      'http',
    ],
    tags: generateTags(config),
    paths: generatePaths(description),
    definitions: generateDefinitions(description),
    securityDefinitions: {
      permissions: {
        type: 'apiKey',
        authorizationUrl: `http://${config.host || 'localhost:3000'}/auth/users/magic-link`,
        in: 'header',
        name: 'Authorization',
        scopes: {
          'email:verified': 'Email verified',
          ...securityDefinitions(),
        },
      },
    },
  };
  return JSON.parse(JSON.stringify(result));
};

const getMiddleware = swaggerDef => [
  swaggerUi.serve,
  swaggerUi.setup(swaggerDef),
];

module.exports = {
  swagger,
  getMiddleware,
};
