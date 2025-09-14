"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add parentId column for hierarchical structure
    await queryInterface.addColumn("stars", "parentId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "stars",
        key: "id",
      },
      onDelete: "CASCADE",
    });

    // Add isFolder column to distinguish folders from regular stars
    await queryInterface.addColumn("stars", "isFolder", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // Add index for efficient parent-child queries
    await queryInterface.addIndex("stars", ["parentId"], {
      name: "stars_parent_id",
    });

    // Add composite index for user-specific folder queries
    await queryInterface.addIndex("stars", ["userId", "parentId"], {
      name: "stars_user_id_parent_id",
    });

    // Add composite index for filtering folders vs regular stars
    await queryInterface.addIndex("stars", ["userId", "isFolder"], {
      name: "stars_user_id_is_folder",
    });

    // Add check constraint to ensure folders don't have documentId or collectionId
    await queryInterface.sequelize.query(`
      ALTER TABLE stars ADD CONSTRAINT stars_folder_content_check 
      CHECK (
        (isFolder = true AND documentId IS NULL AND collectionId IS NULL) OR
        (isFolder = false)
      )
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove check constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE stars DROP CONSTRAINT IF EXISTS stars_folder_content_check
    `);

    // Remove indexes
    await queryInterface.removeIndex("stars", "stars_user_id_is_folder");
    await queryInterface.removeIndex("stars", "stars_user_id_parent_id");
    await queryInterface.removeIndex("stars", "stars_parent_id");

    // Remove columns
    await queryInterface.removeColumn("stars", "isFolder");
    await queryInterface.removeColumn("stars", "parentId");
  },
};
