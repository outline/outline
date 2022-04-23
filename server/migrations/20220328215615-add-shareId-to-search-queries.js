'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("search_queries", "shareId", {
      type: Sequelize.UUID,
      defaultValue: null,
      allowNull: true,
      references: {
        model: "shares",
        key: "id"
      },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("search_queries", "shareId");
  },
};
