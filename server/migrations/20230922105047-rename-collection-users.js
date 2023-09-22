"use strict";

const { Op } = require("sequelize");

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameTable("collection_users", "user_permissions");
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `ALTER INDEX "collection_users_collection_id_user_id" RENAME TO "user_permissions_collection_id_user_id"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER INDEX "collection_users_user_id" RENAME TO "user_permissions_user_id"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ONLY user_permissions RENAME CONSTRAINT "collection_users_collectionId_fkey" TO "user_permissions_collectionId_fkey"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ONLY user_permissions RENAME CONSTRAINT "collection_users_createdById_fkey" TO "user_permissions_createdById_fkey"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ONLY user_permissions RENAME CONSTRAINT "collection_users_userId_fkey" TO "user_permissions_userId_fkey"`,
        { transaction }
      );
      await queryInterface.addColumn(
        "user_permissions",
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
      await queryInterface.addConstraint("user_permissions", {
        type: "check",
        fields: ["collectionId", "documentId"],
        name: "one_of_collectionId_or_documentId_be_non_null",
        where: {
          [Op.or]: [
            { collectionId: { [Op.ne]: null } },
            { documentId: { [Op.ne]: null } },
          ],
        },
        transaction,
      });
      await queryInterface.removeConstraint(
        "user_permissions",
        "user_permissions_collectionId_fkey",
        { transaction }
      );
      await queryInterface.addConstraint("user_permissions", {
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
        "user_permissions",
        "collectionId",
        {
          type: Sequelize.UUID,
          allowNull: true,
        },
        { transaction }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameTable("user_permissions", "collection_users");
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `ALTER INDEX "user_permissions_collection_id_user_id" RENAME TO "collection_users_collection_id_user_id"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER INDEX "user_permissions_user_id" RENAME TO "collection_users_user_id"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ONLY collection_users RENAME CONSTRAINT "user_permissions_collectionId_fkey" TO "collection_users_collectionId_fkey"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ONLY collection_users RENAME CONSTRAINT "user_permissions_createdById_fkey" TO "collection_users_createdById_fkey"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ONLY collection_users RENAME CONSTRAINT "user_permissions_userId_fkey" TO "collection_users_userId_fkey"`,
        { transaction }
      );
      await queryInterface.removeConstraint(
        "collection_users",
        "one_of_collectionId_or_documentId_be_non_null",
        { transaction }
      );
      await queryInterface.removeColumn("collection_users", "documentId", {
        transaction,
      });
      await queryInterface.removeConstraint(
        "collection_users",
        "collection_users_collectionId_fkey",
        { transaction }
      );
      await queryInterface.addConstraint("collection_users", {
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
        `DELETE FROM collection_users WHERE "collectionId" IS NULL`,
        { transaction }
      );
      await queryInterface.changeColumn(
        "collection_users",
        "collectionId",
        {
          type: Sequelize.UUID,
          allowNull: false,
        },
        { transaction }
      );
    });
  },
};
