'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn("users", "invitedById", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "users",
      },
    });
  },

  down: async (queryInterface) => {
    return queryInterface.removeColumn("users", "invitedById");
  }
};
