// @flow
/* global jest */
require('dotenv').config({ silent: true });

// test environment variables
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
process.env.NODE_ENV = 'test';

const Sequelize = require('sequelize');
const sequelize = require('../sequelize').sequelize;
const Umzug = require('umzug');

const queryInterface = sequelize.getQueryInterface();

function runMigrations() {
  const umzug = new Umzug({
    storage: 'sequelize',
    storageOptions: {
      sequelize,
    },
    migrations: {
      params: [queryInterface, Sequelize],
      path: './server/migrations',
    },
  });
  return umzug.up();
}

runMigrations();

// This is needed for the relative manual mock to be picked up
// $FlowFixMe
jest.mock('../events');
