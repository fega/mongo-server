const createError = require('http-errors');
const express = require('express');
const path = require('path');
const logger = require('morgan');
const chalk = require('chalk').default;
const indexRouter = require('./routes');
const errorHandler = require('./lib/middleware/errorHandler');
const { prepareShutdown } = require('./lib/util/process');
const { shutdownMongodb } = require('./lib/mongodb/index');

const tag = chalk.cyan('[m-server]');

/**
 *
 * @param {*} config
 * @param {import('mongodb').Db} db
 * @param {import('mongodb').MongoClient} [client]
 */
const createServer = (config, db, client) => {
  /**
   * create express server
   */
  const app = express();

  /**
   * Enable status monitor
   * @see https://github.com/RafalWilinski/express-status-monitor
   */
  if (config.statusMonitor) {
    app.use(require('express-status-monitor')(config.statusMonitor));
  }

  /**
   * Enable morgan http logger
   */
  if (process.env.NODE_ENV !== 'test') app.use(logger(config.morgan || 'dev'));

  /**
   * enable compression if config.compress is present
   */
  if (config.compress) app.use(require('compression')(config.compress));

  /**
   * body Parsing
   */
  app.use(express.json(config.json));
  app.use(express.urlencoded(config.urlencoded || { extended: false }));

  /**
   * Enable cors module
   */
  if (config.cors) app.use(require('cors')(config.cors));

  /**
   * Enable helmet module
   */
  if (config.helmet) app.use(require('helmet')(config.helmet));

  /**
   * Raven RequestHandler
   */
  if (config.raven) {
    const Raven = require('raven');
    Raven.config(config.raven).install();
    app.use(Raven.requestHandler());
  }

  /**
   * Enable static file serving
   */
  app.use(config.staticRoot || '/', express.static(path.join(process.cwd(), config.static || 'public')));

  /**
   * enable trust proxy
   */
  if (config.trustProxy) app.enable('trust proxy');

  /**
   * Custom middleware
   */
  if (config.middleware) app.use(config.middleware);

  /**
   * Plugins
   */
  if (config.plugins) {
    config.plugins.forEach(plugin => app.use(plugin(config, db, client)));
  }

  /**
   * REST API mount
   */
  app.use(config.root || '/', indexRouter(config, db));

  /**
   * 404 handler
   */
  app.use((req, res, next) => { next(createError(404)); });

  /**
   * Raven
   */
  if (config.raven) {
    const Raven = require('raven');
    app.use(Raven.errorHandler());
  }

  /**
   * error handler
   */
  if (config.errorHandler) app.use(config.errorHandler);
  app.use(errorHandler);

  if (!config.noListen) {
    app.listen(config.port, () => {
      if (config.silent) return;
      console.log(tag, `server listen on port ${chalk.yellow(config.port)}`);
    });
  }

  /**
   * On process exit handler
   */
  if (config.shutdown) {
    prepareShutdown(config.shutdown(client, config));
  } else if (client) {
    prepareShutdown(shutdownMongodb(client));
  }

  return app;
};

module.exports = createServer;
