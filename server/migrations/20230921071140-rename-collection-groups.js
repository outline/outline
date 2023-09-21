"use strict";

const { Op } = require("sequelize");

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameTable("collection_groups", "group_permissions");
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `ALTER INDEX "collection_groups_collection_id_group_id" RENAME TO "group_permissions_collection_id_group_id"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER INDEX "collection_groups_deleted_at" RENAME TO "group_permissions_deleted_at"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER INDEX "collection_groups_group_id" RENAME TO "group_permissions_group_id"`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE ONLY group_permissions RENAME CONSTRAINT "collection_groups_collectionId_fkey" TO "group_permissions_collectionId_fkey"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ONLY group_permissions RENAME CONSTRAINT "collection_groups_createdById_fkey" TO "group_permissions_createdById_fkey"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ONLY group_permissions RENAME CONSTRAINT "collection_groups_groupId_fkey" TO "group_permissions_groupId_fkey"`,
        { transaction }
      );
      await queryInterface.removeConstraint(
        "group_permissions",
        "group_permissions_collectionId_fkey",
        { transaction }
      );
      await queryInterface.addConstraint("group_permissions", {
        fields: ["collectionId"],
        name: "group_permissions_collectionId_fkey",
        type: "foreign key",
        onDelete: "set null",
        references: {
          table: "collections",
          field: "id",
        },
        transaction,
      });
      await queryInterface.changeColumn(
        "group_permissions",
        "collectionId",
        {
          type: Sequelize.UUID,
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.addColumn(
        "group_permissions",
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
      await queryInterface.addConstraint("group_permissions", {
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
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameTable("group_permissions", "collection_groups");
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `ALTER INDEX "group_permissions_collection_id_group_id" RENAME TO "collection_groups_collection_id_group_id"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER INDEX "group_permissions_deleted_at" RENAME TO "collection_groups_deleted_at"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER INDEX "group_permissions_group_id" RENAME TO "collection_groups_group_id"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ONLY collection_groups RENAME CONSTRAINT "group_permissions_collectionId_fkey" TO "collection_groups_collectionId_fkey"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ONLY collection_groups RENAME CONSTRAINT "group_permissions_createdById_fkey" TO "collection_groups_createdById_fkey"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE ONLY collection_groups RENAME CONSTRAINT "group_permissions_groupId_fkey" TO "collection_groups_groupId_fkey"`,
        { transaction }
      );
      await queryInterface.removeConstraint(
        "collection_groups",
        "collection_groups_collectionId_fkey",
        { transaction }
      );
      await queryInterface.addConstraint("collection_groups", {
        fields: ["collectionId"],
        name: "collection_groups_collectionId_fkey",
        type: "foreign key",
        onDelete: "cascade",
        references: {
          table: "collections",
          field: "id",
        },
        transaction,
      });
      await queryInterface.changeColumn(
        "collection_groups",
        "collectionId",
        {
          type: Sequelize.UUID,
          allowNull: false,
        },
        { transaction }
      );
      await queryInterface.removeConstraint(
        "collection_groups",
        "one_of_collectionId_or_documentId_be_non_null",
        { transaction }
      );
      await queryInterface.removeColumn("collection_groups", "documentId", {
        transaction,
      });
    });
  },
};
