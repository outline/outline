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

    await queryInterface.sequelize.query(
      `UPDATE users SET role = 'viewer' WHERE "isViewer" = true`,
      {
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );
    await queryInterface.sequelize.query(
      `UPDATE users SET role = 'admin' WHERE "isAdmin" = true`,
      {
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );
    await queryInterface.sequelize.query(
      `UPDATE users SET role = 'member' WHERE role IS NULL`,
      {
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );
  },

  async down (queryInterface) {
    await queryInterface.removeColumn("users", "role");
  }
};