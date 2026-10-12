"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'ALTER TABLE "oauth_clients" ALTER COLUMN "teamId" DROP NOT NULL;',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE "oauth_clients" ALTER COLUMN "clientSecret" DROP NOT NULL;',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE "oauth_clients" ALTER COLUMN "clientId" TYPE VARCHAR(1024);',
        { transaction }
      );
      await queryInterface.addColumn(
        "oauth_clients",
        "metadataExpiresAt",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction }
      );

      // A client has no team exactly when it is identified by a metadata
      // document URL.
      await queryInterface.sequelize.query(
        `ALTER TABLE "oauth_clients" ADD CONSTRAINT "oauth_clients_team_id_or_metadata_document"
          CHECK (("teamId" IS NULL) = ("clientId" LIKE 'https://%'));`,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'DELETE FROM "oauth_clients" WHERE "teamId" IS NULL;',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE "oauth_clients" DROP CONSTRAINT IF EXISTS "oauth_clients_team_id_or_metadata_document";',
        { transaction }
      );
      await queryInterface.removeColumn("oauth_clients", "metadataExpiresAt", {
        transaction,
      });
      await queryInterface.sequelize.query(
        'ALTER TABLE "oauth_clients" ALTER COLUMN "clientId" TYPE VARCHAR(255);',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE "oauth_clients" ALTER COLUMN "clientSecret" SET NOT NULL;',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE "oauth_clients" ALTER COLUMN "teamId" SET NOT NULL;',
        { transaction }
      );
    });
  },
};
