"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.changeColumn(
        "oauth_clients",
        "createdById",
        {
          type: Sequelize.UUID,
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.addColumn(
        "oauth_clients",
        "lastActiveAt",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.addColumn(
        "oauth_clients",
        "registrationAccessTokenHash",
        {
          type: Sequelize.STRING,
          allowNull: true,
          unique: true,
        },
        { transaction }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn(
        "oauth_clients",
        "registrationAccessTokenHash",
        { transaction }
      );
      await queryInterface.removeColumn("oauth_clients", "lastActiveAt", {
        transaction,
      });
      await queryInterface.changeColumn(
        "oauth_clients",
        "createdById",
        {
          type: Sequelize.UUID,
          allowNull: false,
        },
        { transaction }
      );
    });
  },
};
