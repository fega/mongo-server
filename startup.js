const chalk = require('chalk');
const path = require('path');
const { findKey } = require('lodash');
const pkg = require('./package');
const connect = require('./db');
const createServer = require('./server');
const { isDbEmpty, seedDb } = require('./lib/mongodb');

const tag = chalk.cyan('[m-server]');

const pe = new (require('pretty-error'))(); //eslint-disable-line

const main = async (programConfig) => {
  try {
    // start
    console.log(tag, `Version: ${pkg.version}`);
    /**
     * Set default config
     */
    let config = {
      port: programConfig.port || 3000,
      host: programConfig.host || 'localhost',
      mongo: programConfig.mongo || 'mongodb://localhost:27017',
      db: programConfig.db || 'mongo-server',
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
    const db = await connect(config);
    console.log(tag, 'using', chalk.yellow(db.databaseName), 'database');
    /**
     * SeedDatabase
     */
    if (config.seed) {
      console.log(tag, 'Seeding Db');
      const isEmpty = await isDbEmpty(db);
      if (isEmpty) {
        await seedDb(db, config);
      } else {
        console.log(tag, 'Db already have data, skipping');
      }
    }
    /**
     * creating the server
     */
    createServer(config, db);
  } catch (error) {
    throw error;
  }
};
module.exports = main;
