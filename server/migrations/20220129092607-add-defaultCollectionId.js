'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("teams", "defaultCollectionId", {
      type: Sequelize.UUID,
      defaultValue: null,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("teams", "defaultCollectionId");
  }
};
