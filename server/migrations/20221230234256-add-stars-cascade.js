'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint("stars", "stars_collectionId_fkey")
    await queryInterface.changeColumn("stars", "collectionId", {
      type: Sequelize.UUID,
      allowNull: true,
      onDelete: "cascade",
      references: {
        model: "collections",
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint("stars", "stars_collectionId_fkey")
    await queryInterface.changeColumn("stars", "collectionId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "collections",
      },
    });
  }
};
