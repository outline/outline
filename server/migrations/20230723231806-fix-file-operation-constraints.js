'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeConstraint("file_operations", "file_operations_collectionId_fkey", { transaction });
      await queryInterface.changeColumn("file_operations", "collectionId", {
        type: Sequelize.UUID,
        allowNull: true,
        onDelete: "cascade",
        references: {
          model: "collections",
        },
      }, {
        transaction,
      });

      await queryInterface.removeConstraint("file_operations", "file_operations_teamId_fkey", { transaction });
      await queryInterface.changeColumn("file_operations", "teamId", {
        type: Sequelize.UUID,
        allowNull: false,
        onDelete: "cascade",
        references: {
          model: "teams",
        },
      }, {
        transaction
      });
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeConstraint("file_operations", "file_operations_collectionId_fkey", { transaction });
      await queryInterface.changeColumn("file_operations", "collectionId", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "collections",
        },
      }, {
        transaction,
      });

      await queryInterface.removeConstraint("file_operations", "file_operations_teamId_fkey", { transaction });
      await queryInterface.changeColumn("file_operations", "teamId", {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "teams",
        },
      }, {
        transaction,
      });
    });
  }
};
