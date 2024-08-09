"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("collections", "archivedAt", {
        type: Sequelize.DATE,
        allowNull: true,
        transaction,
      });
      await queryInterface.addIndex("collections", ["archivedAt"], {
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex("collections", ["archivedAt"], {
        transaction,
      });
      await queryInterface.removeColumn("collections", "archivedAt", {
        transaction,
      });
    });
  },
};
