
const chalk = require('chalk').default;
const path = require('path');
const { findKey } = require('lodash');
const pkg = require('./package');
const connect = require('./db');
const createServer = require('./server');
const { isDbEmpty, seedDb } = require('./lib/mongodb');
const { describeServer } = require('./swagger/util');
const { swagger } = require('./swagger/generator');
const tag = chalk.cyan('[m-server]');


const main = async (programConfig = {}) => {
  try {
    // start
    console.log(tag, `Version: ${pkg.version}`);

    /**
     * Set default config
     */
    let config = {
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
      console.log(tag, 'Reading config file');
      const file = require(path.resolve(programConfig.config)); // eslint-disable-line
      config = { ...config, ...file };
      console.log(tag, 'Config file loaded');
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
    console.log(tag, 'connecting to mongodb');
    const db = await connect(config).catch((error) => {
      console.error(tag, 'error connecting to mongodb');
      console.error(error);
      process.exit(1);
    });
    console.log(tag, 'using', chalk.yellow(db.databaseName), 'database');

    /**
     * SeedDatabase
     */
    if (config.seed) {
      console.log(tag, 'Seeding Db');
      const isEmpty = await isDbEmpty(db);
      if (config.forceSeed) console.log(tag, 'Db seeding will be forced');
      if (config.forceSeed || isEmpty) await seedDb(db, config);
      else console.log(tag, 'Db already have data, skipping');
    }

    /**
     * Server description
     */
    config.description = describeServer(config);
    config.swagger = swagger(config);

    /**
     * creating the server
     */
    const app = await createServer(config, db);

    return { app, db };
  } catch (error) {
    throw error;
  }
};
module.exports = main;
