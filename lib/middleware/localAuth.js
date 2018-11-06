const HttpError = require('http-errors');


exports.populateUser = (db, resourceName) => async (req, res, next) => {
  console.log('hereeee');
  console.log(req.user._id);
  if (req.user) {
    const user = await db.collection(resourceName).findOne({ _id: req.user._id });
    if (user) req.user = user;
  }

  next();
};
