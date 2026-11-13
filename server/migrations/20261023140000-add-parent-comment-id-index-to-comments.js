"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Covers reply lookups when a thread is deleted or resolved.
    await queryInterface.sequelize.query(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "comments_parent_comment_id" ON "comments" ("parentCommentId");'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX CONCURRENTLY IF EXISTS "comments_parent_comment_id";'
    );
  },
};
