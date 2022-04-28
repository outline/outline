"use strict";

const { v4 } = require("uuid");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable("team_domains", {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
        },
        teamId: {
          type: Sequelize.UUID,
          allowNull: false,
          onDelete: "cascade",
          references: {
            model: "teams",
          },
        },
        createdById: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "users",
          },
        },
        name: {
          type: Sequelize.STRING,
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
      }, {
        transaction
      });

      await queryInterface.addIndex("team_domains", ["teamId", "name"], {
        transaction,
        unique: true,
      });

      const currentAllowedDomainsEnv = process.env.ALLOWED_DOMAINS || process.env.GOOGLE_ALLOWED_DOMAINS;
      const currentAllowedDomains = currentAllowedDomainsEnv ? currentAllowedDomainsEnv.split(",") : [];

      if (currentAllowedDomains.length > 0) {
        const [adminUserIDs] = await queryInterface.sequelize.query('select id from users where "isAdmin" = true limit 1', { transaction })
        const adminUserID = adminUserIDs[0]?.id

        if (adminUserID) {
          const [teams] = await queryInterface.sequelize.query('select id from teams', { transaction })
          const now = new Date();

          for (const team of teams) {
            for (const domain of currentAllowedDomains) {
              await queryInterface.sequelize.query(`
                INSERT INTO team_domains ("id", "teamId", "createdById", "name", "createdAt", "updatedAt")
                VALUES (:id, :teamId, :createdById, :name, :createdAt, :updatedAt)
                `, {
                  replacements: {
                    id: v4(),
                    teamId: team.id,
                    createdById: adminUserID,
                    name: domain,
                    createdAt: now,
                    updatedAt: now,
                  },
                  transaction,
                }
              );
            }
          }
        }
      }
    });
  },
  down: async (queryInterface) => {
    return queryInterface.dropTable("team_domains");
  },
};
