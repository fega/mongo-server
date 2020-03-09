const { validate: isEmail } = require('email-validator');
const HttpError = require('http-errors');
const date = require('date.js');
const jwt = require('jsonwebtoken');
const { generate } = require('randomstring');
const { ObjectId } = require('mongodb');
const { isFunction } = require('lodash');
const { getDefaultPost } = require('../');
const template = require('../templates/magicLink');


const getConfig = (obj = {}) => ({
  // field where email should be stored
  emailField: 'email',
  // collection to save tokens
  collection: 'moser-magic-links',
  // max active tokens
  max: 3,
  // expiration time
  exp: 'in one day',
  // redirect user to this url if token is not found
  redirectNotFound: null,
  // redirect user to this url if token is Already used
  redirectAlreadyUsed: null,
  // redirect user to this url if token on  success
  redirectSuccess: null,
  // custom verify logic
  doVerify: null,
  // custom token generation logic
  doGenerate: null,
  // custom logic after user is created
  doUserCreatedOrUpsert: null,
  // custom token retrieve logic
  doRetrieve: null,
  // custom token before retrieve logic
  doBeforeRetrieve: null,
  // default user data
  default: null,
  // send JWT token when requesting magic link
  // be careful, this could lead to a security issue
  sendJwt: false,


  ...obj,
  // email (Nodemailer) configuration
  email: Object.assign({}, {
    from: 'email@email.com',
    text: (config, user, url, token) => `${url}`, // eslint-disable-line
    html: template,
    subject: 'Hey! use this link to login in our app',
    ...obj.email || {},
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
  const email = (req.body[conf.emailField] || '').toLowerCase();
  if (!email) throw new HttpError.BadRequest('Missing Email');
  if (!isEmail(email)) throw new HttpError.BadRequest('Invalid Email');
  const tokens = await MagicTokens.find({ email, exp: { $gte: new Date() } }).toArray();
  if (tokens.length >= conf.max) throw new HttpError.TooManyRequests('Token limit reached');

  /**
    * Handle custom logic
    */
  const user = await User.findOne({ [conf.emailField]: email });
  const _id = user ? false : new ObjectId().toString();
  if (conf.doGenerate) {
    await conf.doGenerate({
      req, res, next, user, HttpError, db, resourceName, newUserId: _id, email,
    });
  }
  /**
    * Create and  store token, also create user if it didnt exist
    */
  const token = generate(50) + new ObjectId().toString();
  const search = generate(50) + new ObjectId().toString();
  await MagicTokens.insertOne({
    email,
    exp: date(conf.exp, null),
    token,
    search,
  });
  let userCreated = false;
  if (!user && !conf.default) {
    userCreated = true;
    await User.insertOne({ _id, email });
  }
  if (!user && conf.default) {
    userCreated = true;
    await User
      .insertOne({
        ...await getDefaultPost(await conf.default(req.body, user), user, req, db),
        _id,
        email,
      });
  }

  if (conf.doUserCreatedOrUpsert) {
    await conf.doUserCreatedOrUpsert({
      req, res, next, HttpError, db, resourceName, userId: _id || user._id, email,
    });
  }
  /**
   * Send email
   */
  const url = `${config.host + config.root}auth/${resourceName}/magic-link/${token}`;
  const searchUrl = `${config.host + config.root}auth/${resourceName}/magic-token/${search}`;
  await transport.sendMail({
    to: email,
    from: conf.email.from,
    text: conf.email.text(config, user, url, token),
    html: conf.email.html(config, user, url, token),
    title: conf.email.title,
    subject: isFunction(conf.email.subject)
      ? conf.email.text(config, user, url, token)
      : conf.email.subject,

  });
  /**
   * return token _id
   */
  const $token = conf.sendJwt ? await jwt.sign(
    {
      _id: _id || user._id,
      resource: resourceName,
    },
    config.jwtSecret,
  ) : undefined;

  return res.send({
    searchToken: search,
    searchUrl,
    userCreated,
    $token,
    _id: conf.sendJwt ? (_id || user._id) : undefined,
  });
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

  if (Object.keys(STATUS).includes(tokenObj.status)) {
    if (conf.redirectAlreadyUsed) return res.redirect(conf.redirectAlreadyUsed);
    throw new HttpError.BadRequest('Token already used');
  }
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
   * Custom logic before retrieve token
   */
  if (conf.doBeforeRetrieve) {
    await conf.doBeforeRetrieve({
      req, res, next, db, HttpError, token: req.params.token,
    });
  }

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
   * Custom logic
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
    .update({ email: tokenObj.email }, { $set: { status: STATUS.RETRIEVED } }, { multi: true });

  /**
   * return token
   */
  return res.send({
    $token,
    _id: user._id,
  });
};
