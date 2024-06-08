'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "role", {
      type: Sequelize.ENUM("admin", "member", "viewer", "guest"),
      allowNull: true,
    });
    if (process.env.DEPLOYMENT === "hosted") {
      return;
    }

    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `UPDATE users SET role = 'viewer' WHERE "isViewer" = true`,
        {
          transaction,
          type: queryInterface.sequelize.QueryTypes.UPDATE,
        }
      );
      await queryInterface.sequelize.query(
        `UPDATE users SET role = 'admin' WHERE "isAdmin" = true`,
        {
          transaction,
          type: queryInterface.sequelize.QueryTypes.UPDATE,
        }
      );
      await queryInterface.sequelize.query(
        `UPDATE users SET role = 'member' WHERE role IS NULL`,
        {
          transaction,
          type: queryInterface.sequelize.QueryTypes.UPDATE,
        }
      );
    });
  },

  async down (queryInterface) {
    await queryInterface.removeColumn("users", "role");
  }
};