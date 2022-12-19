'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint("integrations", "integrations_collectionId_fkey")
    await queryInterface.changeColumn("integrations", "collectionId", {
      type: Sequelize.UUID,
      allowNull: true,
      onDelete: "cascade",
      references: {
        model: "collections",
      },
    });
    await queryInterface.removeConstraint("integrations", "integrations_teamId_fkey")
    await queryInterface.changeColumn("integrations", "teamId", {
      type: Sequelize.UUID,
      allowNull: false,
      onDelete: "cascade",
      references: {
        model: "teams",
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint("integrations", "integrations_collectionId_fkey")
    await queryInterface.changeColumn("integrations", "collectionId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "collections",
      },
    });
    await queryInterface.removeConstraint("integrations", "integrations_teamId_fkey")
    await queryInterface.changeColumn("integrations", "teamId", {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "teams",
      },
    });
  }
};
