"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("attachments", "expiresAt", {
        type: Sequelize.DATE,
        allowNull: true,
        transaction,
      });
      await queryInterface.addIndex("attachments", ["expiresAt"], {
        transaction
      });
    });
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn("attachments", "expiresAt", { transaction });
      await queryInterface.removeIndex("attachments", ["expiresAt"], { transaction });
    });
  },
};
