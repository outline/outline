"use strict";

module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("users", "slackData");
    await queryInterface.removeColumn("teams", "slackData");
  },
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("teams", "slackData", {
      type: "JSONB",
      allowNull: true,
    });
    await queryInterface.addColumn("users", "slackData", {
      type: "JSONB",
      allowNull: true,
    });
  },
};
