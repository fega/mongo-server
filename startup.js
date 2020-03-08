
const chalk = require('chalk').default;
const path = require('path');
const { findKey } = require('lodash');
const pkg = require('./package');
const connect = require('./lib/mongodb/connect');
const createServer = require('./server');
const { isDbEmpty, seedDb } = require('./lib/mongodb');
const { describeServer } = require('./swagger/util');
const { swagger } = require('./swagger/generator');

const tag = chalk.cyan('[m-server]');


const main = async (programConfig = {}) => {
  const log = (...str) => {
    if (programConfig.silent) return;
    console.log(tag, ...str);
  };
  try {
    // start
    log(`Version: ${pkg.version}`);

    /**
     * Set default config
     */
    let config = {
      ...programConfig,
      // noListen: programConfig.noListen || false,
      json: programConfig.json,
      urlencoded: programConfig.urlencoded || { extended: false },
      port: programConfig.port || 3000,
      host: programConfig.host || 'http://localhost:3000',
      mongo: programConfig.mongo || 'mongodb://localhost:27017',
      db: programConfig.db || 'mongo-server',
      pagination: programConfig.pagination || 10,
      settings: {
        restrictWhereQuery: true,
        ...(programConfig.settings || {}),
      },
    };

    /**
     * read and merge config file
     */
    if (programConfig.config) {
      log('Reading config file');
      const file = require(path.resolve(programConfig.config)); // eslint-disable-line
      config = { ...config, ...file };
      log('Config file loaded');
    }

    /**
     * NodeMailerConfig
     */
    if (findKey(config.resources || {}, 'email')) {
      config.nodemailer = config.nodemailer || {
        sendmail: true,
        newline: 'unix',
        path: '/usr/sbin/sendmail',
      };
    }

    /**
     * connecting to mongodb
     */
    log('connecting to mongodb');
    const [db, client] = await connect(config).catch((error) => {
      log(tag, 'error connecting to mongodb');
      log(error);
      process.exit(1);
      return [];
    });
    log('using', chalk.yellow(db.databaseName), 'database');

    /**
     * SeedDatabase
     */
    if (config.seed) {
      log('Seeding Db');
      const isEmpty = await isDbEmpty(db);
      if (config.forceSeed) log('Db seeding will be forced');
      if (config.forceSeed || isEmpty) await seedDb(db, config);
      else log('Db already have data, skipping');
    }

    /**
     * Server description
     */
    config.description = describeServer(config);
    config.swagger = swagger(config);

    /**
     * creating the server
     */
    const app = await createServer(config, db, client);

    return { app, db, client };
  } catch (error) {
    throw error;
  }
};
module.exports = main;
