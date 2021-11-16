"use strict";

module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("documents", "editorVersion", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("revisions", "editorVersion", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("documents", "editorVersion");
    await queryInterface.removeColumn("revisions", "editorVersion");
  },
};
