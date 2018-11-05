const generate = (config) => {
  const swagger = {
    swagger: '2.0',
    info: {
      description: config.description || 'Rest api',
      version: config.version || '1.0.0',
      title: config.appName || 'Moser',
      host: config.host,
      basePath: config.root,
    },
    schemes: [
      'https',
      'http',
    ],
    tags: generateTags(config),
    paths: generatePaths(config),
    definitions: generateDefinitions(config),
    securityDefinitions: {
      permissions: {
        type: 'apiKey',
        authorizationUrl: 'http://herd.fyi/auth/users/magic-link',
        in: 'header',
        scopes: {
          'email:verified': 'Email verified',
        },
      },
    },
  };
};

module.exports = generate;
