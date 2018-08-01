const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const chalk = require('chalk');
const indexRouter = require('./routes/index');

const tag = chalk.cyan('[m-server]');


module.exports = async (config, db) => {
  /**
   * create express server
   */
  const app = express();
  if (process.env.NODE_ENV !== 'test') app.use(logger('dev'));
  app.use(express.json());
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/', indexRouter(db));
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
