"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("notifications", "archivedAt", {
        type: Sequelize.DATE,
        allowNull: true,
        transaction,
      });
      await queryInterface.addIndex("notifications", ["archivedAt"], {
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex("notifications", ["archivedAt"], {
        transaction,
      });
      await queryInterface.removeColumn("notifications", "archivedAt", {
        transaction,
      });
    });
  },
};
