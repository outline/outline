'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("users", "teamId", {
      type: Sequelize.UUID,
      onDelete: "cascade",
      references: {
        model: "teams",
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("users", "teamId", {
      type: Sequelize.UUID,
    });
  }
};
