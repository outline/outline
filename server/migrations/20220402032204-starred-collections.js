'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("stars", "collectionId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "collections",
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("stars", "collectionId");
  }
};
