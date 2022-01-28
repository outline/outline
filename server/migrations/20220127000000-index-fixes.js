"use strict";

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addIndex("views", ["lastEditingAt"], {
      name: "views_last_editing_at",
    });
    await queryInterface.addIndex("pins", ["teamId"], {
      name: "pins_team_id",
    });
    await queryInterface.addIndex("collections", ["teamId", "deletedAt"], {
      name: "collections_team_id_deleted_at",
    });
    await queryInterface.addIndex("stars", ["userId", "documentId"], {
      name: "stars_user_id_document_id",
    });
    await queryInterface.addIndex("documents", ["collectionId"], {
      name: "documents_collection_id",
    });
    await queryInterface.addIndex("documents", ["publishedAt"], {
      name: "documents_published_at",
    });
    await queryInterface.addIndex("documents", ["teamId", "deletedAt"], {
      name: "documents_team_id",
    });

    // somehow these indexes were being used sometimes, but i'll never know how.
    // Note: These are not recreated in the down method
    await queryInterface.removeIndex("documents", "documents_id_atlas_id_published_at");
    await queryInterface.removeIndex("documents", "documents_id_team_id_deleted_at");
    await queryInterface.removeIndex("documents", "documents_id_deleted_at");
    await queryInterface.removeIndex("collections", "atlases_id_deleted_at");
    await queryInterface.removeIndex("collections", "atlases_id_team_id_deleted_at");
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex("views", "views_last_editing_at");
    await queryInterface.removeIndex("pins", "pins_team_id");
    await queryInterface.removeIndex("collections", "collections_team_id_deleted_at");
    await queryInterface.removeIndex("stars", "stars_user_id_document_id");
    await queryInterface.removeIndex("documents", "documents_collection_id");
    await queryInterface.removeIndex("documents", "documents_published_at");
    await queryInterface.removeIndex("documents", "documents_team_id");
  },
};
