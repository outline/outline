"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.changeColumn(
        "webhook_subscriptions",
        "url",
        {
          type: Sequelize.STRING(1024),
          allowNull: false,
        },
        { transaction }
      );
      await queryInterface.changeColumn(
        "oauth_clients",
        "developerUrl",
        {
          type: Sequelize.STRING(1024),
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.changeColumn(
        "oauth_clients",
        "avatarUrl",
        {
          type: Sequelize.STRING(1024),
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.changeColumn(
        "oauth_clients",
        "redirectUris",
        {
          type: Sequelize.ARRAY(Sequelize.STRING(1024)),
          allowNull: false,
          defaultValue: [],
        },
        { transaction }
      );
      await queryInterface.changeColumn(
        "oauth_authorization_codes",
        "redirectUri",
        {
          type: Sequelize.STRING(1024),
          allowNull: false,
        },
        { transaction }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.changeColumn(
        "oauth_authorization_codes",
        "redirectUri",
        {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        { transaction }
      );
      await queryInterface.changeColumn(
        "oauth_clients",
        "redirectUris",
        {
          type: Sequelize.ARRAY(Sequelize.STRING(255)),
          allowNull: false,
          defaultValue: [],
        },
        { transaction }
      );
      await queryInterface.changeColumn(
        "oauth_clients",
        "avatarUrl",
        {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.changeColumn(
        "oauth_clients",
        "developerUrl",
        {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.changeColumn(
        "webhook_subscriptions",
        "url",
        {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        { transaction }
      );
    });
  },
};
