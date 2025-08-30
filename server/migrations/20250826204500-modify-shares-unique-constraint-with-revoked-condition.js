"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create a partial unique index that only applies when revokedAt is NULL
    // This ensures that only non-revoked shares have the unique constraint
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX CONCURRENTLY "shares_urlId_teamId_not_revoked_uk"
         ON "shares" ("urlId", "teamId")
         WHERE "revokedAt" IS NULL;`
    );

    // Remove the existing unique constraint
    await queryInterface.removeConstraint("shares", "shares_urlId_teamId_uk");
  },

  async down(queryInterface, Sequelize) {
    // Restore the original unique constraint
    await queryInterface.addConstraint("shares", {
      fields: ["urlId", "teamId"],
      type: "unique",
      name: "shares_urlId_teamId_uk",
    });

    // Remove the partial unique index
    await queryInterface.sequelize.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "shares_urlId_teamId_not_revoked_uk";`
    );
  },
};
