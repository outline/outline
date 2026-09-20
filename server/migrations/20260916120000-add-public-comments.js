"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "shares",
        "allowPublicComments",
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        { transaction }
      );
      await queryInterface.addColumn(
        "comments",
        "isPublic",
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        { transaction }
      );
      await queryInterface.addColumn(
        "comments",
        "guestName",
        {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.addColumn(
        "comments",
        "guestEmail",
        {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        { transaction }
      );
      // Preserve the existing foreign key while allowing guest authors.
      await queryInterface.sequelize.query(
        'ALTER TABLE "comments" ALTER COLUMN "createdById" DROP NOT NULL',
        { transaction }
      );
      await queryInterface.addIndex("comments", ["documentId", "isPublic"], {
        name: "comments_document_id_is_public",
        transaction,
      });
    });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Refuse the rollback if guest comments remain, preserving their data
      // and the entire schema rather than partially reverting the migration.
      await queryInterface.sequelize.query(
        'ALTER TABLE "comments" ALTER COLUMN "createdById" SET NOT NULL',
        { transaction }
      );
      await queryInterface.removeIndex(
        "comments",
        "comments_document_id_is_public",
        { transaction }
      );
      await queryInterface.removeColumn("comments", "guestEmail", {
        transaction,
      });
      await queryInterface.removeColumn("comments", "guestName", {
        transaction,
      });
      await queryInterface.removeColumn("comments", "isPublic", {
        transaction,
      });
      await queryInterface.removeColumn("shares", "allowPublicComments", {
        transaction,
      });
    });
  },
};
