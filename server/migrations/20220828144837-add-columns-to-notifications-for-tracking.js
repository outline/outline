'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.addColumn("notifications", "viewedAt", {
        type: Sequelize.DATE,
        allowNull: true,
      });

      await queryInterface.addColumn("notifications", "emailedAt", {
        type: Sequelize.DATE,
        allowNull: true,
      });

      await queryInterface.addColumn("notifications", "teamId", {
        type: Sequelize.UUID,
        references: {
          model: "teams",
          key: "id",
        }
      });

      await queryInterface.addColumn("notifications", "documentId", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "documents",
          key: "id",
        }
      });

      await queryInterface.changeColumn("notifications", "actorId", {
        type: Sequelize.UUID,
        allowNull: true,
      });

      await queryInterface.removeColumn("notifications", "email");

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.removeColumn("notifications", "viewedAt");
      await queryInterface.removeColumn("notifications", "emailedAt");
      await queryInterface.removeColumn("notifications", "teamId");
      await queryInterface.removeColumn("notifications", "documentId");
      await queryInterface.changeColumn("notifications", "actorId", {
        type: Sequelize.UUID,
        allowNull: false,
      });
      await queryInterface.addColumn("notifications", "email", {
        type: Sequelize.BOOLEAN,
      });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
}
