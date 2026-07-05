"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "documents",
        "verifiedAt",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.addColumn(
        "documents",
        "verifiedById",
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "users",
          },
          onDelete: "SET NULL",
        },
        { transaction }
      );
      await queryInterface.addColumn(
        "documents",
        "verificationExpiresAt",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.addColumn(
        "documents",
        "verificationInterval",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.addColumn(
        "collections",
        "verificationInterval",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.addIndex(
        "documents",
        ["teamId", "verificationExpiresAt"],
        {
          name: "documents_team_id_verification_expires_at",
          where: {
            verificationExpiresAt: {
              [Sequelize.Op.ne]: null,
            },
          },
          transaction,
        }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex(
        "documents",
        "documents_team_id_verification_expires_at",
        { transaction }
      );
      await queryInterface.removeColumn("documents", "verificationInterval", {
        transaction,
      });
      await queryInterface.removeColumn("documents", "verificationExpiresAt", {
        transaction,
      });
      await queryInterface.removeColumn("documents", "verifiedById", {
        transaction,
      });
      await queryInterface.removeColumn("documents", "verifiedAt", {
        transaction,
      });
      await queryInterface.removeColumn("collections", "verificationInterval", {
        transaction,
      });
    });
  },
};
