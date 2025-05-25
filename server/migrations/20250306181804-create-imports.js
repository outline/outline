"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.createTable(
        "imports",
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
          },
          name: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          service: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          state: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          input: {
            type: Sequelize.JSONB,
            allowNull: false,
          },
          documentCount: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          integrationId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "integrations",
            },
          },
          createdById: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "users",
            },
          },
          teamId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "teams",
            },
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          deletedAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex("imports", ["service", "teamId"], {
        transaction,
      });
      await queryInterface.addIndex("imports", ["state", "teamId"], {
        transaction,
      });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.removeIndex("imports", ["service", "teamId"], {
        transaction,
      });
      await queryInterface.removeIndex("imports", ["state", "teamId"], {
        transaction,
      });
      await queryInterface.dropTable("imports", { transaction });
    });
  },
};
