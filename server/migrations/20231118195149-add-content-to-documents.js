'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("documents", "content", {
      type: Sequelize.JSONB,
      allowNull: true,
    });
    await queryInterface.addColumn("revisions", "content", {
      type: Sequelize.JSONB,
      allowNull: true,
    });
  },

  async down (queryInterface) {
    await queryInterface.removeColumn("revisions", "content");
    await queryInterface.removeColumn("documents", "content");
  }
};
