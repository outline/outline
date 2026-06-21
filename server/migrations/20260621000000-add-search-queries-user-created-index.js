"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex("search_queries", ["userId", "createdAt"], {
      name: "search_queries_user_id_created_at",
      concurrently: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      "search_queries",
      "search_queries_user_id_created_at"
    );
  },
};
