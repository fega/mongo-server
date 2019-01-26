const swaggerUi = require('swagger-ui-express');
const { generateTags, describeServer } = require('./util');

const swagger = (config) => {
  // const description = describeServer(config);
  const result = {
    swagger: '2.0',
    info: {
      description: config.description || 'Rest api',
      version: config.version || '1.0.0',
      title: config.appName || 'Moser',
      host: config.host,
      basePath: config.root || '/',
    },
    schemes: [
      'https',
      'http',
    ],
    // tags: generateTags(config),
    // paths: generatePaths(config),
    // definitions: generateDefinitions(config),
    // securityDefinitions: {
    //   permissions: {
    //     type: 'apiKey',
    //     authorizationUrl: 'http://herd.fyi/auth/users/magic-link',
    //     in: 'header',
    //     scopes: {
    //       'email:verified': 'Email verified',
    //     },
    //   },
    // },
  };
  return result;
};

const getMiddleware = config => [
  swaggerUi.serve,
  swaggerUi.setup(swagger(config)),
];

module.exports = {
  swagger,
  getMiddleware,
};
