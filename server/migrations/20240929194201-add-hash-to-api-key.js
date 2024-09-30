'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn("apiKeys", "hash", {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      }, { transaction });

      await queryInterface.addColumn("apiKeys", "last4", {
        type: Sequelize.STRING(4),
        allowNull: true,
      }, { transaction });

      await queryInterface.changeColumn("apiKeys", "secret", {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.removeColumn("apiKeys", "hash", { transaction });
      await queryInterface.removeColumn("apiKeys", "last4", { transaction });
      await queryInterface.changeColumn("apiKeys", "secret", {
        type: Sequelize.STRING,
        allowNull: false,
      }, { transaction });
    });
  }
};
