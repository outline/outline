"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE comments AS reply
      SET "resolvedAt" = parent."resolvedAt",
          "resolvedById" = parent."resolvedById"
      FROM comments AS parent
      WHERE reply."parentCommentId" = parent.id
        AND parent."resolvedAt" IS NOT NULL
        AND reply."resolvedAt" IS NULL;
    `);
  },

  async down() {
    // No-op: the inherited resolved state on replies is now load-bearing for
    // the unresolved commentCount counter cache, so it cannot safely be undone.
  },
};
