"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add composite index on service and type for better filtering
    await queryInterface.addIndex("integrations", ["service", "type"], {
      name: "integrations_service_type",
    });

    // Add GIN index on settings for JSONB queries
    await queryInterface.sequelize.query(
      'CREATE INDEX "integrations_settings_gin" ON "integrations" USING GIN ("settings");'
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("integrations", "integrations_settings_gin");
    await queryInterface.removeIndex("integrations", "integrations_service_type");
  },
};
