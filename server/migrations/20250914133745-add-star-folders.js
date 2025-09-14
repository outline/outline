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

    // Note: Check constraint to ensure folders don't have documentId or collectionId
    // is enforced at the application level in the Star model and API validation
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex("stars", "stars_user_id_is_folder");
    await queryInterface.removeIndex("stars", "stars_user_id_parent_id");
    await queryInterface.removeIndex("stars", "stars_parent_id");

    // Remove columns
    await queryInterface.removeColumn("stars", "isFolder");
    await queryInterface.removeColumn("stars", "parentId");
  },
};
