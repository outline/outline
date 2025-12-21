"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex(
      "integrations",
      ["service", "type", "createdAt"],
      {
        name: "integrations_service_type_createdAt",
        concurrently: true,
      }
    );

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "integrations_settings_slack_gin"
      ON integrations
      USING gin ((settings->'slack'))
      WHERE service = 'slack' AND type = 'linkedAccount';
    `);

    await queryInterface.addIndex(
      "user_authentications",
      ["providerId", "createdAt"],
      {
        name: "user_authentications_providerId_createdAt",
        concurrently: true,
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      "integrations",
      "integrations_service_type_createdAt"
    );

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "integrations_settings_slack_gin";
    `);

    await queryInterface.removeIndex(
      "user_authentications",
      "user_authentications_providerId_createdAt"
    );
  },
};
