'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn("attachments", "url", { transaction });
      await queryInterface.removeColumn("users", "service", { transaction });
      await queryInterface.removeColumn("teams", "slackId", { transaction });
      await queryInterface.removeColumn("teams", "googleId", { transaction });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("attachments", "url", {
        type: Sequelize.STRING(4096),
        allowNull: false,
        transaction
      });
      await queryInterface.addColumn("user", "service", {
        type: Sequelize.STRING,
        allowNull: true,
        transaction
      });
      await queryInterface.addColumn("team", "slackId", {
        type: Sequelize.STRING,
        allowNull: true,
        transaction
      });
      await queryInterface.addColumn("team", "googleId", {
        type: Sequelize.STRING,
        allowNull: true,
        transaction
      });
    });
  }
};
