"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("group_users", "permission", {
      type: Sequelize.ENUM("admin", "member"),
      allowNull: false,
      defaultValue: "member",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("group_users", "permission");
  },
};
