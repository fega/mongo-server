const { validate: isEmail } = require('email-validator');
const HttpError = require('http-errors');
const date = require('date.js');
const { generate } = require('randomstring');
const { ObjectId } = require('mongodb');
const { pick, isFunction } = require('lodash');
const { getDefaultPost } = require('../index');
const template = require('../templates/magicToken');
const textTemplate = require('../templates/magicTokenText');

const getConfig = (obj = {}) => ({
  emailField: 'email',
  collection: 'moser-magic-codes',
  max: 3,
  length: 4,
  exp: 'in one day',
  redirectNotFound: null,
  redirectAlreadyUsed: null,
  redirectSuccess: null,
  doVerify: null,
  doGenerate: null,
  default: null,
  extraTokenFields: [], // fields to be extracted from first req.body and added to token
  ...obj,
  email: Object.assign({}, {
    from: 'email@email.com',
    text: textTemplate,
    html: template,
    subject: 'Hey! use this link to login in our app',
    ...obj.email || {},
  }),

});
const STATUS = {
  VERIFIED: 'VERIFIED',
  RETRIEVED: 'RETRIEVED',
};

exports.magicCodeCreateToken = (
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
  const conf = getConfig(config.resources[resourceName].auth.magicCode);
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
  const _id = !user ? new ObjectId().toString():false;
  if (conf.doGenerate) {
    await conf.doGenerate({
      req, res, next, user, HttpError, db, resourceName, newUserId: _id,
    });
  }
  /**
     * Create and  store token, also create user if it didnt exist
     */
  const token = generate({
    length: 4,
    charset: 'numeric',
  });
  await MagicTokens.insertOne({
    ...pick(req.body, conf.extraTokenFields),
    email,
    exp: date(conf.exp, null),
    token,
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
        ...await getDefaultPost(conf.default(req.body, user), user, req, db),
        _id,
        email,
      });
  }
  /**
   * Send email
   */

  await transport.sendMail({
    to: email,
    from: conf.email.from,
    text: conf.email.text(config, user, token),
    html: conf.email.html(config, user, token),
    title: conf.email.title,
    subject: isFunction(conf.email.subject)
      ? conf.email.subject(config, user, token)
      : conf.email.subject,
  });
  /**
   * return token _id
   */
  return res.send({ userCreated });
};

exports.magicCodeVerifyToken = (config, db, magicResources) => async (req, res, next) => {
  const jwt = require('jsonwebtoken'); // eslint-disable-line global-require
  /**
   * Only resources with magic links
   */
  const resourceName = req.params.resource;
  const { token, email } = req.params;
  if (!magicResources.includes(resourceName)) return next();
  /**
   * Validate token
   */
  if (!token) throw new HttpError.BadRequest('Missing Token');
  if (!email) throw new HttpError.BadRequest('Missing Email');
  /**
   * Get config
   */
  const conf = getConfig(config.resources[resourceName].auth.magicCode);
  const MagicTokens = db.collection(conf.collection);
  const User = db.collection(resourceName);

  /**
   * Check that the token is not expired and wasn't used
   */
  const tokenObj = await MagicTokens.findOne({ token, email });
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
   * Add permission magicCode:verified on permissions
   */
  await MagicTokens.updateOne({ _id: tokenObj.id }, { $set: { status: STATUS.VERIFIED } });
  await User.updateOne({ _id: user._id }, { $addToSet: { permissions: 'email:verified' } });
  /**
   * create token and send
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
  return res.send({
    state: 'success',
    $token,
    _id: user._id,
  });
};
