/**
 * Allows the use of express async handlers
 * @param asyncFn Express handler
 */
exports.asyncController = asyncFn => (req, res, next) => Promise
  .resolve(asyncFn(req, res, next)).catch(next);
