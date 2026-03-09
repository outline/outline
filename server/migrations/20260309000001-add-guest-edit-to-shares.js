"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("shares", "allowGuestEdit", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn("shares", "guestEditToken", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("shares", "ghostUserId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("shares", "allowGuestEdit");
    await queryInterface.removeColumn("shares", "guestEditToken");
    await queryInterface.removeColumn("shares", "ghostUserId");
  },
};
