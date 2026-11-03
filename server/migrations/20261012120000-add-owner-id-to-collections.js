"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "collections",
        "ownerId",
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "users",
          },
          onDelete: "SET NULL",
        },
        { transaction }
      );

      // A personal collection must always be private.
      await queryInterface.sequelize.query(
        `ALTER TABLE "collections" ADD CONSTRAINT "collections_owner_id_private"
          CHECK ("ownerId" IS NULL OR "permission" IS NULL);`,
        { transaction }
      );
    });

    // One personal collection per user and team. The leading ownerId column
    // also covers the foreign key checks when a user is deleted.
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "collections_owner_id_team_id"
        ON "collections" ("ownerId", "teamId") WHERE "ownerId" IS NOT NULL;`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX CONCURRENTLY IF EXISTS "collections_owner_id_team_id";'
    );
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'ALTER TABLE "collections" DROP CONSTRAINT IF EXISTS "collections_owner_id_private";',
        { transaction }
      );
      await queryInterface.removeColumn("collections", "ownerId", {
        transaction,
      });
    });
  },
};
