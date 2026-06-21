"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Covers the searches.list query (userId filter + createdAt ordering).
    await queryInterface.addIndex("search_queries", ["userId", "createdAt"], {
      name: "search_queries_user_id_created_at",
      concurrently: true,
    });

    // Now redundant: fully covered by the composite index above as a
    // leftmost-prefix.
    await queryInterface.removeIndex("search_queries", ["userId"]);

    // Unused: no query filters or orders by createdAt without also
    // constraining userId.
    await queryInterface.removeIndex("search_queries", ["createdAt"]);
  },

  async down(queryInterface) {
    await queryInterface.addIndex("search_queries", ["createdAt"]);
    await queryInterface.addIndex("search_queries", ["userId"]);
    await queryInterface.removeIndex(
      "search_queries",
      "search_queries_user_id_created_at"
    );
  },
};
