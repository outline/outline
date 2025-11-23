"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("notifications", "groupId", {
      type: Sequelize.UUID,
      allowNull: true,
      onDelete: "cascade",
      references: {
        model: "groups",
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("notifications", "groupId");
  },
};
