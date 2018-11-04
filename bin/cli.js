#!/usr/bin/env node
const program = require('commander');
const pkg = require('../package');
const main = require('../startup');

program
  .version(pkg.version)
  .option('-c, --config <filePath>', 'Set config file')
  .option('-p --port <number>', 'Server port')
  .option('-m --mongo <uri>', 'mongodb URI')
  .option('-d --db <string>', 'database name')
  .parse(process.argv);


main(program);
