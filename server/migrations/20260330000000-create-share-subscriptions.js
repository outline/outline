"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "share_subscriptions",
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
          },
          shareId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "shares",
              key: "id",
            },
            onDelete: "CASCADE",
          },
          email: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          emailFingerprint: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          secret: {
            type: Sequelize.STRING(64),
            allowNull: false,
          },
          ipAddress: {
            type: Sequelize.STRING(45),
            allowNull: true,
          },
          confirmedAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          unsubscribedAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          lastNotifiedAt: {
            type: Sequelize.DATE,
            allowNull: true,
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

      await queryInterface.addIndex(
        "share_subscriptions",
        ["shareId", "emailFingerprint"],
        { unique: true, transaction }
      );

      await queryInterface.addIndex(
        "share_subscriptions",
        ["shareId", "confirmedAt"],
        {
          where: { unsubscribedAt: null },
          transaction,
        }
      );

      await queryInterface.addIndex("share_subscriptions", ["ipAddress"], {
        transaction,
      });
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("share_subscriptions", { transaction });
    });
  },
};
