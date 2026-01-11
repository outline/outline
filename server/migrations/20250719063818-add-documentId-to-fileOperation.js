"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("file_operations", "documentId", {
      type: Sequelize.UUID,
      allowNull: true,
      onDelete: "cascade",
      references: {
        model: "documents",
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("file_operations", "documentId");
  },
};
