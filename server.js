const createError = require('http-errors');
const express = require('express');
const path = require('path');
const logger = require('morgan');
const chalk = require('chalk').default;
const indexRouter = require('./routes/index');
const errorHandler = require('./lib/middleware/errorHandler');

const tag = chalk.cyan('[m-server]');


module.exports = (config, db) => {
  /**
   * create express server
   */
  const app = express();

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
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

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
   * Custom middleware
   */
  if (config.middleware) app.use(config.middleware);

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

  if (!config.noListen) app.listen(config.port, () => console.log(tag, `server listen on port ${chalk.yellow(config.port)}`));
  return app;
};
