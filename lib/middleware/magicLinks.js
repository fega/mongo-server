const { validate: isEmail } = require('email-validator');
const HttpError = require('http-errors');
const date = require('date.js');
const { ObjectId } = require('mongodb');
const { getDefaultPost } = require('../');

const rand = (length, current) => {
  const _current = current || '';
  return length ? rand(--length, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'.charAt(Math.floor(Math.random() * 60)) + _current) : _current;
};
const getConfig = (obj = {}) => ({
  emailField: 'email',
  collection: 'moser-magic-links',
  max: 3,
  exp: 'in one day',
  redirectNotFound: null,
  redirectAlreadyUsed: null,
  redirectSuccess: null,
  doVerify: null,
  doGenerate: null,
  doRetrieve: null,
  ...obj,
  email: Object.assign({}, {
    from: 'email@email.com',
    text: (user, token, url) => `${url}`,
    html: (user, token, url) => `${url}`,
    title: 'Hey! use this link to login in our app',
    ...obj.email || true,
  }),

});
const STATUS = {
  VERIFIED: 'VERIFIED',
  RETRIEVED: 'RETRIEVED',
};

exports.magicLinkCreateToken = (
  config, db, magicResources, transport,
) => async (req, res, next) => {
  /**
     * Only resources with magic links
     */
  const resourceName = req.params.resource;
  if (!magicResources.includes(req.params.resource)) return next();

  /**
     * Get configuration
     */
  const conf = getConfig(config.resources[resourceName].auth.magicLink);
  const MagicTokens = db.collection(conf.collection);
  const User = db.collection(resourceName);

  /**
     * Verify email and tokens
     */
  const email = req.body[conf.emailField];
  if (!email) throw new HttpError.BadRequest('Missing Email');
  if (!isEmail(email)) throw new HttpError.BadRequest('Invalid Email');
  const tokens = await MagicTokens.find({ email, exp: { $gte: new Date() } }).toArray();
  if (tokens.length >= conf.max) throw new HttpError.TooManyRequests('Token limit reached');

  /**
     * Handle custom logic
     */
  const user = await User.findOne({ [conf.emailField]: email });
  if (conf.doGenerate) {
    await conf.doGenerate({
      req, res, next, user, HttpError, db, resourceName,
    });
  }
  /**
     * Create and  store token, also create user if it didnt exist
     */
  const token = rand(50) + ObjectId().toString();
  const search = rand(50) + ObjectId().toString();
  await MagicTokens.insertOne({
    email,
    exp: date(conf.exp),
    token,
    search,
  });
  const _id = ObjectId().toString();
  let userCreated = false;
  if (!user && !conf.default) {
    userCreated = true;
    await User.insertOne({ _id, email });
  }
  if (!user && conf.default) {
    userCreated = true;
    await User
      .insertOne({
        ...await getDefaultPost(conf.default(req.body, user), user, req, db),
        _id,
        email,
      });
  }
  // /**
  //  * Send email
  //  */
  const url = `${config.host + config.root}auth/${resourceName}/magic-link/${token}`;
  const searchUrl = `${config.host + config.root}auth/${resourceName}/magic-token/${search}`;
  transport.sendMail({
    to: email,
    from: conf.email.from,
    text: conf.email.text(user, token, url),
    html: conf.email.html(user, token, url),
    title: conf.email.title,
  });
  // /**
  //  * return token _id
  //  */
  return res.send({ searchToken: search, searchUrl, userCreated });
};

exports.magicLinkVerifyToken = (config, db, magicResources) => async (req, res, next) => {
  /**
     * Only resources with magic links
     */
  const resourceName = req.params.resource;
  const { token } = req.params;
  if (!magicResources.includes(resourceName)) return next();
  /**
   * Validate token
   */
  if (!token) throw new HttpError.BadRequest('Missing Token');
  if (req.params.token.length !== 74) throw new HttpError.BadRequest('Wrong Token');
  /**
   * Get config
   */
  const conf = getConfig(config.resources[resourceName].auth.magicLink);
  const MagicTokens = db.collection(conf.collection);
  const User = db.collection(resourceName);

  /**
   * Check that the token is not expired and wasn't used
   */
  const tokenObj = await MagicTokens.findOne({ token });
  if (!tokenObj) throw new HttpError.NotFound('Token not found');
  if (tokenObj.exp.getTime() < new Date().getTime()) throw new HttpError.BadRequest('Token expired');
  if (Object.keys(STATUS).includes(tokenObj.status)) throw new HttpError.BadRequest('Token already used');
  const user = await User.findOne({ [conf.emailField]: tokenObj.email });
  if (!user) throw new HttpError.BadRequest('User is not on db anymore');
  /**
   * handle custom user logic
   */
  if (conf.doVerify) {
    await conf.doVerify({
      req, res, next, user, db, token: tokenObj, HttpError,
    });
  }
  /**
   * Add permission magiclink:verified on permissions
   */
  await MagicTokens.updateOne({ token }, { $set: { status: STATUS.VERIFIED } });
  await User.updateOne({ _id: user._id }, { $addToSet: { permissions: 'email:verified' } });
  /**
   * redirectTo or return 200
   */
  if (conf.redirectSuccess) {
    return res.redirect(conf.redirectSuccess);
  }
  return res.send({ state: 'success' });
};
exports.magicLinkGetUserJwt = (config, db, magicResources) => async (req, res, next) => {
  const jwt = require('jsonwebtoken'); // eslint-disable-line global-require
  const resourceName = req.params.resource;
  const { token: search } = req.params;
  if (!magicResources.includes(resourceName)) return next();

  /**
   * Validate token
   */
  if (!search) throw new HttpError.BadRequest('Missing Token');
  if (req.params.token.length !== 74) throw new HttpError.BadRequest('Wrong Token');

  /**
   * Get config
   */
  const conf = getConfig(config.resources[resourceName].auth.magicLink);
  const MagicTokens = db.collection(conf.collection);
  const User = db.collection(resourceName);

  /**
   * Check that the token is not expired and wasn't used
   */
  const tokenObj = await MagicTokens.findOne({ search });
  if (!tokenObj) throw new HttpError.NotFound('Token not found');
  if (tokenObj.exp.getTime() < new Date().getTime()) throw new HttpError.BadRequest('Token expired');
  if (!tokenObj.status) throw new HttpError.BadRequest('Token not verified');
  if (tokenObj.status === STATUS.RETRIEVED) throw new HttpError.BadRequest('Token already used');
  const user = await User.findOne({ [conf.emailField]: tokenObj.email });
  if (!user) throw new HttpError.BadRequest('User is not on db anymore');
  /**
   * Check that nobody already claimed that token and is not expired
   */
  if (conf.doRetrieve) {
    await conf.doRetrieve({
      req, res, next, user, db, token: tokenObj, HttpError,
    });
  }
  /**
   *  Create jwt token
   */
  const { permissions, _id } = user;
  const $token = await jwt.sign(
    {
      _id,
      resource: resourceName,
      permissions,
    },
    config.jwtSecret,
  );
  await MagicTokens
    .update({ email: tokenObj.email }, { $set: { status: STATUS.VERIFIED } }, { multi: true });

  /**
   * return token
   */
  return res.send({ $token });
};
