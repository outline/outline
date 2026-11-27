"use strict";

// Each index is unused, or another index serves the same queries.
const indexes = [
  {
    name: "views_updated_at",
    definition: 'ON "views" ("updatedAt")',
  },
  {
    name: "documents_url_id_deleted_at",
    definition: 'ON "documents" ("urlId", "deletedAt")',
  },
  {
    name: "backlinks_document_id",
    definition: 'ON "relationships" ("documentId")',
  },
  {
    name: "notifications_emailed_at",
    definition: 'ON "notifications" ("emailedAt")',
  },
  {
    name: "authentication_providers_provider_id",
    definition: 'ON "authentication_providers" ("providerId")',
  },
  {
    name: "teams_subdomain",
    definition: 'ON "teams" ("subdomain")',
  },
  {
    name: "integrations_settings_slack_gin",
    definition:
      "ON \"integrations\" USING gin ((settings -> 'slack')) WHERE service = 'slack' AND type = 'linkedAccount'",
  },
  {
    name: "integrations_service_type",
    definition: 'ON "integrations" ("service", "type")',
  },
  {
    name: "emojis_team_id",
    definition: 'ON "emojis" ("teamId")',
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    for (const index of indexes) {
      await queryInterface.sequelize.query(
        `DROP INDEX CONCURRENTLY IF EXISTS "${index.name}";`
      );
    }
  },

  async down(queryInterface) {
    for (const index of [...indexes].reverse()) {
      await queryInterface.sequelize.query(
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS "${index.name}" ${index.definition};`
      );
    }
  },
};
