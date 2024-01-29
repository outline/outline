'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("teams", "inviteRequired", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("teams", "inviteRequired");
  },
};
