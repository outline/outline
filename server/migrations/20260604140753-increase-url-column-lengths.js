"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("webhook_subscriptions", "url", {
      type: Sequelize.STRING(1024),
      allowNull: false,
    });
    await queryInterface.changeColumn("oauth_clients", "developerUrl", {
      type: Sequelize.STRING(1024),
      allowNull: true,
    });
    await queryInterface.changeColumn("oauth_clients", "avatarUrl", {
      type: Sequelize.STRING(1024),
      allowNull: true,
    });
    await queryInterface.changeColumn("oauth_clients", "redirectUris", {
      type: Sequelize.ARRAY(Sequelize.STRING(1024)),
      allowNull: false,
      defaultValue: [],
    });
    await queryInterface.changeColumn(
      "oauth_authorization_codes",
      "redirectUri",
      {
        type: Sequelize.STRING(1024),
        allowNull: false,
      }
    );
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn(
      "oauth_authorization_codes",
      "redirectUri",
      {
        type: Sequelize.STRING(255),
        allowNull: false,
      }
    );
    await queryInterface.changeColumn("oauth_clients", "redirectUris", {
      type: Sequelize.ARRAY(Sequelize.STRING(255)),
      allowNull: false,
      defaultValue: [],
    });
    await queryInterface.changeColumn("oauth_clients", "avatarUrl", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.changeColumn("oauth_clients", "developerUrl", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.changeColumn("webhook_subscriptions", "url", {
      type: Sequelize.STRING(255),
      allowNull: false,
    });
  },
};
