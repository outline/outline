"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "emojis",
        {
          id: {
            type: Sequelize.UUID,
            primaryKey: true,
            allowNull: false,
          },
          name: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          attachmentId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "attachments",
              key: "id",
            },
            onDelete: "CASCADE",
          },
          teamId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "teams",
              key: "id",
            },
            onDelete: "CASCADE",
          },
          createdById: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "users",
              key: "id",
            },
            onDelete: "CASCADE",
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

      await queryInterface.addIndex("emojis", ["teamId"], { transaction });
      await queryInterface.addIndex("emojis", ["createdById"], { transaction });
      await queryInterface.addIndex("emojis", ["attachmentId"], {
        transaction,
      });
      await queryInterface.addIndex("emojis", ["teamId", "name"], {
        unique: true,
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("emojis");
  },
};
