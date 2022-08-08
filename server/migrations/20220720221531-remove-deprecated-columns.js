'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn("attachments", "url", { transaction });
      await queryInterface.removeColumn("users", "service", { transaction });
      await queryInterface.removeColumn("users", "serviceId", { transaction });
      await queryInterface.removeColumn("teams", "slackId", { transaction });
      await queryInterface.removeColumn("teams", "googleId", { transaction });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("attachments", "url", {
        type: Sequelize.STRING(4096),
        allowNull: false,
        defaultValue: "",
        transaction
      });
      await queryInterface.addColumn("users", "service", {
        type: Sequelize.STRING,
        allowNull: true,
        transaction
      });
      await queryInterface.addColumn("users", "serviceId", {
        type: Sequelize.STRING,
        allowNull: true,
        transaction
      });
      await queryInterface.addColumn("teams", "slackId", {
        type: Sequelize.STRING,
        allowNull: true,
        transaction
      });
      await queryInterface.addColumn("teams", "googleId", {
        type: Sequelize.STRING,
        allowNull: true,
        transaction
      });
    });
  }
};
