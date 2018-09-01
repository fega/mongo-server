#!/usr/bin/env node
const program = require('commander');
const chalk = require('chalk');
const path = require('path');
const pkg = require('./package');
const pe = new (require('pretty-error'))(); //eslint-disable-line
const connect = require('./db');
const createServer = require('./server');

const tag = chalk.cyan('[m-server]');

program
  .version(pkg.version)
  .option('-c, --config <filePath>', 'Set config file')
  .option('-p --port <number>', 'Server port')
  .option('-m --mongo <uri>', 'mongodb URI')
  .option('-d --db <string>', 'database name')
  .parse(process.argv);


const main = async (programConfig) => {
  try {
    // start
    console.log(tag, `Version: ${pkg.version}`);

    // default config
    let config = {
      port: programConfig.port || 3000,
      host: programConfig.host || 'localhost',
      mongo: programConfig.mongo || 'mongodb://localhost:27017',
      db: programConfig.db || 'mongo-server',
    };


    // read and merge config file
    if (programConfig.config) {
      console.log(tag, 'Reading config file');
      const file = require(path.resolve(programConfig.config)); // eslint-disable-line
      config = { ...config, ...file };
      console.log(tag, 'Config file loaded');
    }


    // connecting to mongodb
    console.log(tag, 'connecting to mongodb');
    const db = await connect(config);
    console.log(tag, 'using', chalk.yellow(db.databaseName), 'database');


    // creating the server
    createServer(config, db);
  } catch (error) {
    console.log(pe.render(error));
  }
};


main(program);
