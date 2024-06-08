'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("file_operations", "deletedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down (queryInterface) {
    await queryInterface.removeColumn("file_operations", "deletedAt");
  }
};
