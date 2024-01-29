"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.addColumn(
        "notifications",
        "viewedAt",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "notifications",
        "emailedAt",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addIndex("notifications", ["emailedAt"], {
        name: "notifications_emailed_at",
        transaction,
      });

      await queryInterface.addColumn(
        "notifications",
        "teamId",
        {
          type: Sequelize.UUID,
          references: {
            model: "teams",
            key: "id",
          },
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "notifications",
        "documentId",
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "documents",
            key: "id",
          },
        },
        { transaction }
      );

      await queryInterface.changeColumn(
        "notifications",
        "actorId",
        {
          type: Sequelize.UUID,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.removeColumn("notifications", "email", {
        transaction,
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.removeColumn("notifications", "viewedAt", {
        transaction,
      });
      await queryInterface.removeColumn("notifications", "emailedAt", {
        transaction,
      });
      await queryInterface.removeColumn("notifications", "teamId", {
        transaction,
      });
      await queryInterface.removeColumn("notifications", "documentId", {
        transaction,
      });
      await queryInterface.changeColumn(
        "notifications",
        "actorId",
        {
          type: Sequelize.UUID,
          allowNull: false,
        },
        { transaction }
      );
      await queryInterface.addColumn(
        "notifications",
        "email",
        {
          type: Sequelize.BOOLEAN,
        },
        { transaction }
      );
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
