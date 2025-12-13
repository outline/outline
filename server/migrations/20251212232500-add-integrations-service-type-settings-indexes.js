"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add composite index on service and type for better filtering
    await queryInterface.addIndex("integrations", ["service", "type"], {
      name: "integrations_service_type",
    });

    // Add GIN index on settings for JSONB queries
    // Using raw SQL as Sequelize doesn't support GIN index type natively
    await queryInterface.sequelize.query(
      'CREATE INDEX "integrations_settings_gin" ON "integrations" USING GIN ("settings");'
    );
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes in reverse order of creation
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS "integrations_settings_gin";'
    );
    await queryInterface.removeIndex(
      "integrations",
      "integrations_service_type"
    );
  },
};
