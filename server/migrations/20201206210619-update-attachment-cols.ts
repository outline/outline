"use strict";

module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("attachments", "key", {
      type: Sequelize.STRING(4096),
      allowNull: false,
    });
    await queryInterface.changeColumn("attachments", "url", {
      type: Sequelize.STRING(4096),
      allowNull: false,
    });
  },
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("attachments", "key", {
      type: Sequelize.STRING(255),
      allowNull: false,
    });
    await queryInterface.changeColumn("attachments", "url", {
      type: Sequelize.STRING(255),
      allowNull: false,
    });
  },
};
