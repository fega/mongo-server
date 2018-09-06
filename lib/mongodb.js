const {
  isFunction, isObject, mapValues, map, pickBy,
} = require('lodash');

exports.isDbEmpty = async (db) => {
  const names = await db.listCollections().toArray();
  if (!names.length) return true;

  const countPromises = names.map(col => db.collection(col.name).countDocuments({}));
  const countArr = await (await Promise.all(countPromises)).filter(v => v);
  return !countArr.length;
};

const seedCollection = async (seedObject, db, collection) => {
  let seed = seedObject;
  if (isFunction(seedObject)) {
    seed = seedObject();
  }
  if (Array.isArray(seed)) {
    return db.collection(collection).insertMany(seed);
  }
  return db.collection(collection).insertOne(seed);
};


exports.seedDb = async (db, config) => {
  const { seed, resources } = config;
  // seed
  if (isObject(seed)) {
    const promises = map(seed, (values, collection) => seedCollection(values, db, collection));
    await Promise.all(promises);
  }
  // resources.:resource.seed
  if (isObject(resources)) {
    const resourcesToSeed = mapValues(pickBy(resources, 'seed'), 'seed');
    const promises = map(
      resourcesToSeed,
      (values, collection) => seedCollection(values, db, collection),
    );
    await Promise.all(promises);
  }
};
