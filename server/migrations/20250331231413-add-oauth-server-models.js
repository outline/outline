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
        clientId: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        clientSecret: {
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
          allowNull: false,
          onDelete: "cascade"
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
        codeChallenge: {
          type: Sequelize.STRING,
          allowNull: true
        },
        codeChallengeMethod: {
          type: Sequelize.STRING,
          allowNull: true
        },
        scope: {
          type: Sequelize.ARRAY(Sequelize.STRING),
          allowNull: false
        },
        oauthClientId: {
          type: Sequelize.UUID,
          references: {
            model: "oauth_clients",
          },
          onDelete: "cascade",
          allowNull: false
        },
        userId: {
          type: Sequelize.UUID,
          references: {
            model: "users",
          },
          onDelete: "cascade",
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
          allowNull: false,
          unique: true
        },
        accessTokenExpiresAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        refreshTokenHash: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        refreshTokenExpiresAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        lastActiveAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        scope: {
          type: Sequelize.ARRAY(Sequelize.STRING),
          allowNull: false
        },
        oauthClientId: {
          type: Sequelize.UUID,
          references: {
            model: "oauth_clients",
          },
          onDelete: "cascade",
          allowNull: false
        },
        userId: {
          type: Sequelize.UUID,
          references: {
            model: "users",
          },
          onDelete: "cascade",
          allowNull: false
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

      await queryInterface.addIndex("oauth_clients", ["teamId"], { transaction });
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
