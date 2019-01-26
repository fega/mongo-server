/**
 * Error handler
 */
module.exports = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  res.locals.message = err.message;
  const status = err.status || 500;
  res.status(status);
  if (status === 500) console.error(err);
  const error = {
    status,
    message: err.message,
    error: ['development', 'test'].includes(req.app.get('env')) ? err : undefined,
  };
  res.send(error);
};
