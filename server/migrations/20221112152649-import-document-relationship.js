"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("documents", "importId", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "file_operations",
        },
        transaction,
      });
      await queryInterface.addIndex("documents", ["importId"], {
        transaction
      });
    });

  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex("documents", ["importId"], {
        transaction
      });
      await queryInterface.removeColumn("documents", "importId", {
        transaction
      });
    });
  }
};
