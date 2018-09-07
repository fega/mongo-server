const passport = require('passport');
const Local = require('passport-local').Strategy;
const Jwt = require('passport-jwt').Strategy;
const { mapValues, omit } = require('lodash');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.generateLocalStrategies = (localAuthResources, { jwtSecret = 'secret', resources }, db) => {
  mapValues(localAuthResources, (resourceName) => {
    const authObject = resources[resourceName].auth.local;

    if (Array.isArray(authObject)) {
      const userFieldName = authObject[0];
      const passFieldName = authObject[1];
      passport.use(`local-${resourceName}`, new Local({
        usernameField: userFieldName,
        passwordField: passFieldName,
        session: false,
      }, async (user, pass, done) => {
        try {
          const resource = await db.collection(resourceName).findOne({
            [userFieldName]: user,
          });
          if (!resource) return done(null, null);
          const isValid = await bcrypt.compare(pass, resource[passFieldName]);
          if (isValid) {
            return done(null, {
              ...omit(resource, [passFieldName]),
              $token: await jwt.sign({ resource: resourceName, _id: resource._id.toString() }, jwtSecret),
            });
          }
          return done(null, null);
        } catch (error) {
          done(error);
        }
      }));
    }
  });
};
