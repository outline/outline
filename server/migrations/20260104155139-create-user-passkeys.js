"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "user_passkeys",
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
          },
          name: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          userAgent: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          credentialId: {
            type: Sequelize.TEXT,
            allowNull: false,
            unique: true,
          },
          credentialPublicKey: {
            type: Sequelize.BLOB,
            allowNull: false,
          },
          aaguid: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          counter: {
            type: Sequelize.BIGINT,
            allowNull: false,
            defaultValue: 0,
          },
          transports: {
            type: Sequelize.ARRAY(Sequelize.STRING),
            allowNull: true,
          },
          lastActiveAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          userId: {
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

      await queryInterface.addIndex("user_passkeys", ["userId"], {
        transaction,
      });
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("user_passkeys", { transaction });
    });
  },
};
