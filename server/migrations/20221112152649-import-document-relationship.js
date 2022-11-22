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
      await queryInterface.addColumn("collections", "importId", {
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
      await queryInterface.addIndex("collections", ["importId"], {
        transaction
      });
    });

  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex("collections", ["importId"], {
        transaction
      });
      await queryInterface.removeIndex("documents", ["importId"], {
        transaction
      });
      await queryInterface.removeColumn("collections", "importId", {
        transaction
      });
      await queryInterface.removeColumn("documents", "importId", {
        transaction
      });
    });
  }
};
