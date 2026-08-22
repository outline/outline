"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("documents", "destroyedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addIndex("documents", ["destroyedAt"], {
      name: "documents_destroyed_at",
      concurrently: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("documents", "documents_destroyed_at");
    await queryInterface.removeColumn("documents", "destroyedAt");
  },
};
