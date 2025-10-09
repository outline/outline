"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove the existing unique constraint on documentId and userId
    // This constraint prevents multiple folders (documentId: null) for the same user
    await queryInterface.removeIndex("stars", ["documentId", "userId"]);

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

    // Add a partial unique index that prevents duplicate document stars per user
    // This allows multiple folders (documentId: null) but prevents duplicate document stars
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX stars_user_document_unique 
      ON stars (userId, documentId) 
      WHERE documentId IS NOT NULL
    `);

    // Add a partial unique index that prevents duplicate collection stars per user
    // This allows multiple folders (collectionId: null) but prevents duplicate collection stars
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX stars_user_collection_unique 
      ON stars (userId, collectionId) 
      WHERE collectionId IS NOT NULL
    `);

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

    // Remove the partial unique indexes
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS stars_user_document_unique`
    );
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS stars_user_collection_unique`
    );

    // Remove columns
    await queryInterface.removeColumn("stars", "isFolder");
    await queryInterface.removeColumn("stars", "parentId");

    // Restore the original unique constraint on documentId and userId
    await queryInterface.addIndex("stars", ["documentId", "userId"], {
      unique: true,
    });
  },
};
