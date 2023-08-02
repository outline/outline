"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("documents", "userId");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("documents", "userId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "users",
      },
    });
  },
};
