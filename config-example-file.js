/* eslint-disable */
module.exports = {
  resources: {
    posts: {
      post: false,    // ✔️
      patch: false,   // ✔️
      delete: false,  // ✔️
      restrict: true, // ✔️
      restrictQuery: true,
      csrf: true,
      rateLimit: true,
      csv: true,
      redirect: [302, 'http://google.com'],
      webhook: ['url'],
      reCaptcha: true,
      apicache: '1 hour',
      // webhook: (resource,user)=>{},
      pdf: { title: (resources, user) => '', content: (resources, user) => '' },
      email: { to: ['fega.hg@gmail.com'] }, // ✔️       // email: ['fega.hg@gmail.com'],

      file: { field: 'file' }, // ✔️
      in: {// ✔️
        body: null,   // Joi schema here// ✔️
        query: null,  // Joi schema here// ✔️
        params: null, // Joi schema here// ✔️
      },
      out: (resource, tokenPayload) => ({ ...resource, requestedBy: tokenPayload._id }),
      seed: () => { }, // ✔️
      permissions: [
        ['admin'], // allow if user is admin // ✔️
        ['posts:read', 'posts:write'], // allow if user have posts:read and post:write// ✔️
        ['$ONWER'], // allow if resource is part of resource_id or resource_ids in the target resource
        ['$VERIFIED'], // allow if user is already verified by email or phone code
        (resource, tokenPayload) => { resource.user_id.equals(tokenPayload._id); }, // userId is equals to resource.user_id
      ],
    },
    users: {
      auth: {
        local: ['email', 'password'], // ✔️
        jwt: ['_id', 'permissions'], // ✔️
        restoreEmail: true,
        phoneCode: true,
        facebook: { // same for google and twitter, github, linkedin
          clientID: 'FACEBOOK_APP_ID',
          clientSecret: 'FACEBOOK_APP_SECRET',
          callbackURL: 'http://localhost:3000/auth/facebook/callback',
          scope: [], // domain: 'domain.com' // auth0
        },
      },
      fcmToken: true,
    },
    comments: true,
  },
  host: 'localhost',  // ✔️
  engine: true,
  port: 3000,         // ✔️
  cors: '*',          // ✔️
  compress: true,     // ✔️
  forceSeed: false,
  mongo: 'mongodb://localhost:27017', // ✔️
  middleware: [],     // ✔️
  restrict: true,     // ✔️
  nodemailer: {       // ✔️
    service: 'MailDev',
  },
  raven: {},          // ✔️
  morgan: {},         // ✔️
  sitemap: true,
  robotsTxt: true,
  docs: true,
  reCaptcha: true,
  pagination: 10,     // ✔️
};
