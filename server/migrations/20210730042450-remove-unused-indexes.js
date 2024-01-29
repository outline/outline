"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex("documents", "documents_collaborator_ids");
    await queryInterface.removeIndex("documents", "documents_id_deleted_at");
    await queryInterface.removeIndex("users", "users_slack_id");
    await queryInterface.removeIndex("teams", "teams_slack_id");
    await queryInterface.removeIndex("teams", "teams_google_id");
    await queryInterface.removeIndex(
      "collection_users",
      "collection_users_permission"
    );
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex("documents", ["collaboratorIds"]);
    await queryInterface.addIndex("documents", ["id", "deletedAt"]);
    await queryInterface.addIndex("users", ["slackId"]);
    await queryInterface.addIndex("teams", ["slackId"]);
    await queryInterface.addIndex("teams", ["googleId"]);
    await queryInterface.addIndex("collection_users", ["permission"]);
  },
};
