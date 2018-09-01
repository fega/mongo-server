const asyncController = asyncFn => (req, res, next) => Promise
  .resolve(asyncFn(req, res, next)).catch(next);
exports.asyncController = asyncController;
