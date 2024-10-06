"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("collections", "archivedById", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "users",
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("collections", "archivedById");
  },
};
