"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Covers listing a user's authentications and cascade deletes of users.
    await queryInterface.sequelize.query(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "oauth_authentications_user_id" ON "oauth_authentications" ("userId");'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX CONCURRENTLY IF EXISTS "oauth_authentications_user_id";'
    );
  },
};
