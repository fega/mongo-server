module.exports = {
  resources: {
    posts: {
      $post: false,
      $patch: false,
      $delete: false,
      $restrictFields: true,
      $restrict$query: true,
      $postEmail: ['fega.hg@gmail.com'],
    },
    users: {
      $localAuth: ['email', 'password'],
      $fbAuth: true,
      $googlebAuth: true,
      $fcmToken: true,
      $permissions: [['admin'], ['user:read', 'user:write']],
    },
    comments: true,
  },
  port: 3000, // ✔️
  host: 'localhost',
  cors: '*', // ✔️
  gzip: true, // ✔️
  forceSeed: false,
  mongo: 'mongodb://localhost:27017', // ✔️
  middleware: [], // ✔️
  restrict: true, // ✔️
  engine: true,
};
