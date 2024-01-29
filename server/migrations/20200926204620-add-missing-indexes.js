"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex("search_queries", ["teamId"]);
    await queryInterface.addIndex("search_queries", ["userId"]);
    await queryInterface.addIndex("search_queries", ["createdAt"]);
    await queryInterface.addIndex("users", ["teamId"]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex("search_queries", ["teamId"]);
    await queryInterface.removeIndex("search_queries", ["userId"]);
    await queryInterface.removeIndex("search_queries", ["createdAt"]);
    await queryInterface.removeIndex("users", ["teamId"]);
  },
};
