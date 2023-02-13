"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "mentions",
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
          },
          userId: {
            type: Sequelize.UUID,
            allowNull: true,
            onDelete: "set null",
            references: {
              model: "users",
            },
          },
          mentionUserId: {
            type: Sequelize.UUID,
            allowNull: false,
            onDelete: "cascade",
            references: {
              model: "users",
            },
          },
          documentId: {
            type: Sequelize.UUID,
            allowNull: false,
            onDelete: "cascade",
            references: {
              model: "documents",
            },
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex("mentions", {
        fields: ["userId"],
        transaction,
      });

      await queryInterface.addIndex("mentions", {
        fields: ["mentionUserId"],
        transaction,
      });

      await queryInterface.addIndex("mentions", {
        fields: ["documentId"],
        transaction,
      });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex("mentions", ["userId"], { transaction });
      await queryInterface.removeIndex("mentions", ["mentionUserId"], {
        transaction,
      });
      await queryInterface.removeIndex("mentions", ["documentId"], {
        transaction,
      });
      await queryInterface.dropTable("mentions", { transaction });
    });
  },
};
