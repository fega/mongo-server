const HttpError = require('http-errors');


exports.populateUser = (db, resourceName) => async (req, res, next) => {
  if (req.user) {
    const user = await db.collection(req.user.resource).findOne({ _id: req.user._id });
    if (user) {
      req.user = {
        ...user,
        resource: resourceName,
      };
    }
  }

  next();
};
