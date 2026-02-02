"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "collection_merge_requests",
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue: Sequelize.literal("gen_random_uuid()"),
          },
          targetCollectionId: {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
              model: "collections",
            },
            onDelete: "cascade",
          },
          newCollectionName: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          sourceCollectionIds: {
            type: Sequelize.ARRAY(Sequelize.UUID),
            allowNull: false,
            defaultValue: [],
          },
          status: {
            type: Sequelize.ENUM("pending", "approved", "rejected", "completed"),
            allowNull: false,
            defaultValue: "pending",
          },
          requestedById: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "users",
            },
          },
          teamId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "teams",
            },
            onDelete: "cascade",
          },
          approvals: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          rejections: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          deletedAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex(
        "collection_merge_requests",
        ["teamId", "status"],
        {
          name: "collection_merge_requests_team_id_status_idx",
          transaction,
        }
      );

      await queryInterface.addIndex(
        "collection_merge_requests",
        ["requestedById"],
        {
          name: "collection_merge_requests_requested_by_id_idx",
          transaction,
        }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.dropTable("collection_merge_requests");
  },
};
