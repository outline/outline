"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex("backlinks", ["reverseDocumentId"]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex("backlinks", ["reverseDocumentId"]);
  },
};
