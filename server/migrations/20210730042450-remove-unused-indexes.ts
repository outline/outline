"use strict";

module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
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
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  down: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex("documents", ["collaboratorIds"]);
    await queryInterface.addIndex("documents", ["id", "deletedAt"]);
    await queryInterface.addIndex("users", ["slackId"]);
    await queryInterface.addIndex("teams", ["slackId"]);
    await queryInterface.addIndex("teams", ["googleId"]);
    await queryInterface.addIndex("collection_users", ["permission"]);
  },
};
