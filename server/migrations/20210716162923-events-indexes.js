"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex("events", ["documentId"]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex("events", ["documentId"]);
  },
};
