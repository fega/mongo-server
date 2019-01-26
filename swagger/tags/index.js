const { capitalize, get } = require('lodash');

/**
 * Generates Swagger tags
 * @param {object} config Moser Object
 */
module.exports = (config) => {
  const resources = Object.keys(config.resources);
  if (!resources) return [];

  const r = resources.map(resource => ({
    name: resource,
    description: config.resources[resource] || `${capitalize(resource)} endpoints`,
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
