"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Covers cascade deletes and the cleanup checks for live grants.
    await queryInterface.sequelize.query(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "oauth_authentications_oauth_client_id" ON "oauth_authentications" ("oauthClientId");'
    );
    await queryInterface.sequelize.query(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "oauth_authorization_codes_oauth_client_id" ON "oauth_authorization_codes" ("oauthClientId");'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX CONCURRENTLY IF EXISTS "oauth_authorization_codes_oauth_client_id";'
    );
    await queryInterface.sequelize.query(
      'DROP INDEX CONCURRENTLY IF EXISTS "oauth_authentications_oauth_client_id";'
    );
  },
};
