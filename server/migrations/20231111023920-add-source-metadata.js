'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("documents", "sourceMetadata", {
      type: Sequelize.JSONB,
      allowNull: true,
    });
  },

  async down (queryInterface) {
    await queryInterface.removeColumn("documents", "sourceMetadata");
  }
};
