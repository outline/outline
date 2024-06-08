'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint("search_queries", "search_queries_shareId_fkey")
    await queryInterface.changeColumn("search_queries", "shareId", {
      type: Sequelize.UUID,
      allowNull: true,
      onDelete: "SET NULL",
      references: {
        model: "shares",
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint("search_queries", "search_queries_shareId_fkey")
    await queryInterface.changeColumn("search_queries", "shareId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "shares",
      },
    });
  }
};
