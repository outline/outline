"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("documents", "permanentlyDeletedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addIndex("documents", ["permanentlyDeletedAt"], {
      name: "documents_permanently_deleted_at",
      concurrently: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      "documents",
      "documents_permanently_deleted_at"
    );
    await queryInterface.removeColumn("documents", "permanentlyDeletedAt");
  },
};
