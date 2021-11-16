"use strict";

module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("documents", "state", {
      type: Sequelize.BLOB,
    });
    await queryInterface.addColumn("teams", "collaborativeEditing", {
      type: Sequelize.BOOLEAN,
    });
  },
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("documents", "state");
    await queryInterface.removeColumn("teams", "collaborativeEditing");
  },
};
