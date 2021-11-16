"use strict";

module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("documents", "version", {
      type: Sequelize.SMALLINT,
      allowNull: true,
    });
    await queryInterface.addColumn("revisions", "version", {
      type: Sequelize.SMALLINT,
      allowNull: true,
    });
  },
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("documents", "version");
    await queryInterface.removeColumn("revisions", "version");
  },
};
