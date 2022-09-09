'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeConstraint("notifications", "notifications_userId_fkey", { transaction })
      await queryInterface.removeConstraint("notifications", "notifications_actorId_fkey", { transaction })
      await queryInterface.removeConstraint("notifications", "notifications_teamId_fkey", { transaction })
      await queryInterface.removeConstraint("notifications", "notifications_documentId_fkey", { transaction })
    });
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.changeColumn("notifications", "userId", {
        type: Sequelize.UUID,
        onDelete: "cascade",
        references: {
          model: "users",
        },
        transaction,
      });
      await queryInterface.changeColumn("notifications", "actorId", {
        type: Sequelize.UUID,
        allowNull: true,
        onDelete: "set null",
        references: {
          model: "users",
        },
        transaction,
      });
      await queryInterface.changeColumn("notifications", "teamId", {
        type: Sequelize.UUID,
        allowNull: false,
        onDelete: "cascade",
        references: {
          model: "teams",
        },
        transaction,
      });
      await queryInterface.changeColumn("notifications", "documentId", {
        type: Sequelize.UUID,
        allowNull: true,
        onDelete: "cascade",
        references: {
          model: "documents",
        },
        transaction,
      });
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeConstraint("notifications", "notifications_userId_fkey", { transaction })
      await queryInterface.removeConstraint("notifications", "notifications_actorId_fkey", { transaction })
      await queryInterface.removeConstraint("notifications", "notifications_teamId_fkey", { transaction })
      await queryInterface.removeConstraint("notifications", "notifications_documentId_fkey", { transaction })
    });
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.changeColumn("notifications", "userId", {
        type: Sequelize.UUID,
        references: {
          model: "users",
        },
        transaction,
      });
      await queryInterface.changeColumn("notifications", "actorId", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
        },
        transaction,
      });
      await queryInterface.changeColumn("notifications", "teamId", {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "teams",
        },
        transaction,
      });
      await queryInterface.changeColumn("notifications", "documentId", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "documents",
        },
        transaction,
      });
    });
  }
};
