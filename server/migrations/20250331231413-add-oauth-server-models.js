"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable("oauth_clients", {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        description: {
          type: Sequelize.STRING,
          allowNull: true
        },
        developerName: {
          type: Sequelize.STRING,
          allowNull: true
        },
        developerUrl: {
          type: Sequelize.STRING,
          allowNull: true
        },
        avatarUrl: {
          type: Sequelize.STRING,
          allowNull: true
        },
        secret: {
          type: Sequelize.BLOB,
          allowNull: false
        },
        published: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        teamId: {
          type: Sequelize.UUID,
          references: {
            model: "teams",
          },
          allowNull: false
        },
        createdById: {
          type: Sequelize.UUID,
          references: {
            model: "users",
          },
          allowNull: false
        },
        redirectUris: {
          type: Sequelize.ARRAY(Sequelize.STRING),
          allowNull: false,
          defaultValue: []
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }, {
        transaction
      });

      await queryInterface.createTable("oauth_authorization_codes", {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false
        },
        authorizationCodeHash: {
          type: Sequelize.STRING,
          allowNull: false
        },
        scope: {
          type: Sequelize.STRING,
          allowNull: false
        },
        oauthClientId: {
          type: Sequelize.UUID,
          references: {
            model: "oauth_clients",
          },
          allowNull: false
        },
        userId: {
          type: Sequelize.UUID,
          references: {
            model: "users",
          },
          allowNull: false
        },
        redirectUri: {
          type: Sequelize.STRING,
          allowNull: false
        },
        expiresAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, {
        transaction
      });

      await queryInterface.createTable("oauth_authentications", {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false
        },
        accessTokenHash: {
          type: Sequelize.STRING,
          allowNull: false
        },
        accessTokenExpiresAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        refreshTokenHash: {
          type: Sequelize.STRING,
          allowNull: false
        },
        refreshTokenExpiresAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        scope: {
          type: Sequelize.STRING,
          allowNull: false
        },
        oauthClientId: {
          type: Sequelize.UUID,
          references: {
            model: "oauth_clients",
          },
          allowNull: false
        },
        userId: {
          type: Sequelize.UUID,
          references: {
            model: "users",
          },
          allowNull: false
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }, {
        transaction
      });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("oauth_authentications", { transaction });
      await queryInterface.dropTable("oauth_authorization_codes", { transaction });
      await queryInterface.dropTable("oauth_clients", { transaction });
    });
  }
};
