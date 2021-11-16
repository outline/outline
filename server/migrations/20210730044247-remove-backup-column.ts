"use strict";

module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("documents", "backup");
    await queryInterface.removeColumn("revisions", "backup");
  },
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("documents", "backup", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("revisions", "backup", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },
};
