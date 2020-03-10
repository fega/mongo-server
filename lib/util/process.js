const debug = require('debug');

const prepareShutdown = (shutdown) => {
  debug('moser:shutdown')('prepare shutdown');

  // do something when app is closing
  process.on('exit', shutdown);
  // catches ctrl+c event
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // catches uncaught exceptions
  process.on('uncaughtException', shutdown);
};

/**
 * Default Shutdown Handler
 * @param {*} config MongoServer config
 * @param {import('net').Server} expressServer Express Net Server
 * @param {import('mongodb').MongoClient} mongodbClient Mongodb Client
 */
const defaultShutdownHandler = (config, expressServer, mongodbClient) => () => {
  if (!expressServer) {
    return mongodbClient.close().then(() => process.exit());
  }
  expressServer.close(() => {
    mongodbClient.close().then(() => process.exit());
  });
};

module.exports = {
  defaultShutdownHandler,
  prepareShutdown,
};
