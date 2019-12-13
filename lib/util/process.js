const debug = require('debug');

exports.prepareShutdown = (shutdown) => {
  debug('moser:shutdown')('prepare shutdown');
  debug('moser:shutdown')(shutdown);

  // do something when app is closing
  process.on('exit', shutdown);
  // catches ctrl+c event
  process.on('SIGINT', shutdown);

  // catches "kill pid" (for example: nodemon restart)
  process.on('SIGUSR1', shutdown);
  process.on('SIGUSR2', shutdown);

  // catches uncaught exceptions
  process.on('uncaughtException', shutdown);
};
