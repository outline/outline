"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("authentication_providers", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      providerId: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      teamId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "teams",
        },
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
    await queryInterface.createTable("user_authentications", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
        },
      },
      authenticationProviderId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "authentication_providers",
        },
      },
      accessToken: {
        type: Sequelize.BLOB,
        allowNull: true,
      },
      refreshToken: {
        type: Sequelize.BLOB,
        allowNull: true,
      },
      scopes: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
      },
      providerId: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
    await queryInterface.removeColumn("users", "slackAccessToken");
    await queryInterface.addIndex("authentication_providers", ["providerId"]);
    await queryInterface.addIndex("user_authentications", ["providerId"]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("user_authentications");
    await queryInterface.dropTable("authentication_providers");
    await queryInterface.addColumn("users", "slackAccessToken", {
      type: "bytea",
      allowNull: true,
    });
  },
};
