"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("shares", "collectionId", {
      type: Sequelize.UUID,
      allowNull: true,
      onDelete: "CASCADE",
      references: {
        model: "collections",
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("shares", "collectionId");
  },
};
