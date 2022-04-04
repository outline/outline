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
    await queryInterface.changeColumn("stars", "documentId", {
      type: Sequelize.UUID,
      allowNull: true
    });
    await queryInterface.changeColumn("stars", "documentId", {
      type: Sequelize.UUID,
      references: {
        model: "documents",
      },
    });
    await queryInterface.changeColumn("stars", "userId", {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "users",
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("stars", "collectionId");
  }
};
