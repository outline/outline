'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn("users", "isAdmin", { transaction });
      await queryInterface.removeColumn("users", "isViewer", { transaction });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("users", "isAdmin", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      await queryInterface.addColumn("users", "isViewer", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    });

    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `UPDATE users SET "isAdmin" = true WHERE role = 'admin'`,
        {
          transaction,
          type: Sequelize.QueryTypes.UPDATE,
        }
      );
      await queryInterface.sequelize.query(
        `UPDATE users SET "isViewer" = true WHERE role = 'viewer'`,
        {
          transaction,
          type: Sequelize.QueryTypes.UPDATE,
        }
      );
    });
  }
};