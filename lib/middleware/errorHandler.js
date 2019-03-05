const { mapValues, groupBy } = require('lodash');
/**
 * Error handler
 */
module.exports = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  const env = req.app.get('env');
  const status = err.status || 500;
  res.status(status);
  if (status === 500) console.error(err);

  /**
   * validation error
   */
  if (err.message === 'validation error') {
    return res.status(err.status).json({
      status,
      message: err.message,
      code: err.code || 'VALIDATION_ERROR',
      validation: {
        ...mapValues(groupBy(err.errors, 'location'), v => v.map(v2 => v2.messages).join(',')),
      },
      error: ['development', 'test'].includes(env) ? err.stack : undefined,
    });
  }

  /**
   * Normal error
   */
  const error = {
    status,
    message: err.message,
    error: ['development', 'test'].includes(env) ? err : undefined,
  };
  return res.send(error);
};
