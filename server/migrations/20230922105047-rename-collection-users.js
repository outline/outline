"use strict";

const { Op } = require("sequelize");

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `DROP VIEW IF EXISTS user_permissions`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER INDEX "collection_users_collection_id_user_id" RENAME TO "user_permissions_collection_id_user_id"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER INDEX "collection_users_user_id" RENAME TO "user_permissions_user_id"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ONLY collection_users RENAME CONSTRAINT "collection_users_collectionId_fkey" TO "user_permissions_collectionId_fkey"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ONLY collection_users RENAME CONSTRAINT "collection_users_createdById_fkey" TO "user_permissions_createdById_fkey"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ONLY collection_users RENAME CONSTRAINT "collection_users_userId_fkey" TO "user_permissions_userId_fkey"`,
        { transaction }
      );
      await queryInterface.addColumn(
        "collection_users",
        "documentId",
        {
          type: Sequelize.UUID,
          allowNull: true,
          onDelete: "set null",
          references: {
            model: "documents",
          },
        },
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ONLY collection_users RENAME CONSTRAINT "collection_users_documentId_fkey" TO "user_permissions_documentId_fkey"`,
        { transaction }
      );
      await queryInterface.removeConstraint(
        "collection_users",
        "user_permissions_collectionId_fkey",
        { transaction }
      );
      await queryInterface.addConstraint("collection_users", {
        fields: ["collectionId"],
        name: "user_permissions_collectionId_fkey",
        type: "foreign key",
        onDelete: "set null",
        references: {
          table: "collections",
          field: "id",
        },
        transaction,
      });
      await queryInterface.changeColumn(
        "collection_users",
        "collectionId",
        {
          type: Sequelize.UUID,
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.removeConstraint(
        "collection_users",
        "user_permissions_createdById_fkey",
        { transaction }
      );
      await queryInterface.addConstraint("collection_users", {
        fields: ["createdById"],
        name: "user_permissions_createdById_fkey",
        type: "foreign key",
        onDelete: "set null",
        references: {
          table: "users",
          field: "id",
        },
        transaction,
      });
      await queryInterface.renameTable("collection_users", "user_permissions", {
        transaction,
      });
      await queryInterface.sequelize.query(
        `CREATE VIEW collection_users AS SELECT * FROM user_permissions`,
        { transaction }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `DROP VIEW IF EXISTS collection_users`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER INDEX "user_permissions_collection_id_user_id" RENAME TO "collection_users_collection_id_user_id"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER INDEX "user_permissions_user_id" RENAME TO "collection_users_user_id"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ONLY user_permissions RENAME CONSTRAINT "user_permissions_collectionId_fkey" TO "collection_users_collectionId_fkey"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ONLY user_permissions RENAME CONSTRAINT "user_permissions_createdById_fkey" TO "collection_users_createdById_fkey"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ONLY user_permissions RENAME CONSTRAINT "user_permissions_userId_fkey" TO "collection_users_userId_fkey"`,
        { transaction }
      );
      await queryInterface.removeColumn("user_permissions", "documentId", {
        transaction,
      });
      await queryInterface.removeConstraint(
        "user_permissions",
        "collection_users_collectionId_fkey",
        { transaction }
      );
      await queryInterface.addConstraint("user_permissions", {
        fields: ["collectionId"],
        name: "collection_users_collectionId_fkey",
        type: "foreign key",
        onDelete: "cascade",
        references: {
          table: "collections",
          field: "id",
        },
        transaction,
      });
      // Delete records where collectionId is null before setting back non null constraint
      await queryInterface.sequelize.query(
        `DELETE FROM user_permissions WHERE "collectionId" IS NULL`,
        { transaction }
      );
      await queryInterface.changeColumn(
        "user_permissions",
        "collectionId",
        {
          type: Sequelize.UUID,
          allowNull: false,
        },
        { transaction }
      );
      await queryInterface.removeConstraint(
        "user_permissions",
        "collection_users_createdById_fkey",
        { transaction }
      );
      await queryInterface.addConstraint("user_permissions", {
        fields: ["createdById"],
        name: "collection_users_createdById_fkey",
        type: "foreign key",
        references: {
          table: "users",
          field: "id",
        },
        transaction,
      });
      await queryInterface.renameTable("user_permissions", "collection_users", {
        transaction,
      });
      await queryInterface.sequelize.query(
        `CREATE VIEW user_permissions AS SELECT * FROM collection_users`,
        { transaction }
      );
    });
  },
};
