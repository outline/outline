"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Covers the scan for stuck import tasks, which pages by createdAt.
    await queryInterface.sequelize.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "import_tasks_pending_created_at" ON "import_tasks" ("createdAt", "id") WHERE "state" IN ('created', 'in_progress');`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX CONCURRENTLY IF EXISTS "import_tasks_pending_created_at";'
    );
  },
};
