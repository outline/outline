'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("user_authentications", "expiresAt", {
      type: Sequelize.DATE,
      allowNull: true
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("user_authentications", "expiresAt");
  },
};
