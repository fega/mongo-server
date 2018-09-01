const createError = require('http-errors');
const express = require('express');
const path = require('path');
// const cookieParser = require('cookie-parser');
const logger = require('morgan');
const chalk = require('chalk');
const compress = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const indexRouter = require('./routes/index');

const tag = chalk.cyan('[m-server]');


module.exports = async (config, db) => {
  /**
   * create express server
   */
  const app = express();
  /**
   * Enable morgan http logger
   */
  if (process.env.NODE_ENV !== 'test') app.use(logger('dev'));
  /**
   * enable compression if config.compress is present
   */
  if (config.compress) app.use(compress(config.compress));
  /**
   * body Parsing
   */
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  /**
   * Ebable cors module
   */
  if (config.cors) app.use(cors(config.cors));
  /**
   * Enable helmet module
   */
  if (config.helmet) app.use(helmet(config.helmet));
  /**
   * Enable static file serving
   */
  app.use(config.staticRoot || '/', express.static(path.join(__dirname, config.static || 'public')));
  /**
   * REST API mount
   */
  app.use(config.root || '/', indexRouter(db));
  app.use((req, res, next) => { next(createError(404)); });
  app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    const status = err.status || 500;
    res.status(status);
    if (status === 500) console.error(err);
    res.send(res.locals.error);
  });
  if (!config.noListen) app.listen(config.port, () => console.log(tag, `server listen on port ${chalk.yellow(config.port)}`));
  return app;
};
