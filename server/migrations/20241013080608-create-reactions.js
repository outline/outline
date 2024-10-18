"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.createTable(
        "reactions",
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
          },
          emoji: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          userId: {
            type: Sequelize.UUID,
            allowNull: false,
            onDelete: "cascade",
            references: {
              model: "users",
            },
          },
          commentId: {
            type: Sequelize.UUID,
            allowNull: false,
            onDelete: "cascade",
            references: {
              model: "comments",
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
        },
        { transaction }
      );

      await queryInterface.addIndex("reactions", ["emoji", "userId"], {
        transaction,
      });
      await queryInterface.addIndex("reactions", ["commentId"], {
        transaction,
      });

      await queryInterface.addColumn(
        "comments",
        "reactions",
        {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        { transaction }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.dropTable("reactions", { transaction });
      await queryInterface.removeColumn("comments", "reactions", {
        transaction,
      });
    });
  },
};
