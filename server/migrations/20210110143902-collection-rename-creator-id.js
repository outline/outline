"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.renameColumn(
      "collections",
      "creatorId",
      "createdById"
    );
  },
  down: async (queryInterface, Sequelize) => {
    return queryInterface.renameColumn(
      "collections",
      "createdById",
      "creatorId"
    );
  },
};
