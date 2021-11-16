"use strict";

module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex("search_queries", ["teamId"]);
    await queryInterface.addIndex("search_queries", ["userId"]);
    await queryInterface.addIndex("search_queries", ["createdAt"]);
    await queryInterface.addIndex("users", ["teamId"]);
  },
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex("search_queries", ["teamId"]);
    await queryInterface.removeIndex("search_queries", ["userId"]);
    await queryInterface.removeIndex("search_queries", ["createdAt"]);
    await queryInterface.removeIndex("users", ["teamId"]);
  },
};
