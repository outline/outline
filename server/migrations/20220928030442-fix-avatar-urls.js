'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.changeColumn("users", "avatarUrl", {
        type: Sequelize.STRING(4096),
        allowNull: true,
        transaction,
      });
      await queryInterface.changeColumn("teams", "avatarUrl", {
        type: Sequelize.STRING(4096),
        allowNull: true,
        transaction,
      });
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.changeColumn("users", "avatarUrl", {
        type: Sequelize.STRING,
        allowNull: true,
        transaction,
      });
      await queryInterface.changeColumn("teams", "avatarUrl", {
        type: Sequelize.STRING,
        allowNull: true,
        transaction,
      });
    });
  }
};
