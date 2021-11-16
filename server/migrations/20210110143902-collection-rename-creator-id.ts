"use strict";

module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  up: async (queryInterface, Sequelize) => {
    return queryInterface.renameColumn(
      "collections",
      "creatorId",
      "createdById"
    );
  },
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  down: async (queryInterface, Sequelize) => {
    return queryInterface.renameColumn(
      "collections",
      "createdById",
      "creatorId"
    );
  },
};
