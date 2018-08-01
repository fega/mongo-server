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
    },
    $restrict: true,
  },
  port: 3000,
  host: 'localhost',
  cors: '*',
  gzip: true,
  forceSeed: false,
  mongo: 'mongodb://localhost:27017',
  middleware: [],
};
