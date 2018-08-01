const { MongoClient } = require('mongodb');

let client;
let db;


module.exports = async (config = {}) => {
  if (!client) {
    const url = config.mongo || 'mongodb://localhost:27017';
    const dbName = config.db || 'myproject';
    client = await MongoClient.connect(url, { useNewUrlParser: true });
    db = client.db(dbName);
  }
  return db;
};
