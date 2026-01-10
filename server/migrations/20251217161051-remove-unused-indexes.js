"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeIndex("views", "views_last_editing_at");
    await queryInterface.removeIndex("attachments", "attachments_key");
    await queryInterface.removeIndex("documents", "documents_popularity_score");
    await queryInterface.removeIndex(
      "notifications",
      "notifications_archived_at"
    );
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS "atlases_tsv_idx";'
    );
    await queryInterface.removeIndex("search_queries", ["source"]);
    await queryInterface.removeIndex(
      "notifications",
      "notifications_viewed_at"
    );
    await queryInterface.removeIndex(
      "user_authentications",
      "user_authentications_provider_id"
    );
    await queryInterface.removeIndex("relationships", ["type"]);
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS "integrations_settings_gin";'
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addIndex("views", ["lastEditingAt"], {
      name: "views_last_editing_at",
    });
    await queryInterface.addIndex("attachments", ["key"], {
      name: "attachments_key",
    });
    await queryInterface.addIndex("documents", ["popularityScore"], {
      name: "documents_popularity_score",
    });
    await queryInterface.addIndex("notifications", ["archivedAt"], {
      name: "notifications_archived_at",
    });
    await queryInterface.sequelize.query(
      'CREATE INDEX atlases_tsv_idx ON collections USING gin("searchVector");'
    );
    await queryInterface.addIndex("search_queries", ["source"]);
    await queryInterface.addIndex("notifications", ["viewedAt"], {
      name: "notifications_viewed_at",
    });
    await queryInterface.addIndex("user_authentications", ["providerId"], {
      name: "user_authentications_provider_id",
    });
    await queryInterface.addIndex("relationships", ["type"]);
    await queryInterface.sequelize.query(
      'CREATE INDEX "integrations_settings_gin" ON "integrations" USING GIN ("settings");'
    );
  },
};
