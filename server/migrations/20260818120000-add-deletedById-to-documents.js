"use strict";

const BATCH_SIZE = 1000;

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Every statement is idempotent because the migration cannot run inside a
    // transaction, so a failure part way through has to be resumable.
    await queryInterface.sequelize.query(
      'ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "deletedById" uuid;'
    );

    // NOT VALID adds the constraint without scanning the existing rows, which
    // would hold an exclusive lock for the length of that scan. VALIDATE then
    // checks them under a lock that still allows reads and writes.
    const [constraints] = await queryInterface.sequelize.query(
      `SELECT 1 FROM pg_constraint WHERE conname = 'documents_deletedById_fkey';`
    );
    if (!constraints.length) {
      await queryInterface.sequelize.query(`
        ALTER TABLE "documents"
        ADD CONSTRAINT "documents_deletedById_fkey"
        FOREIGN KEY ("deletedById") REFERENCES "users" ("id")
        NOT VALID;
      `);
    }
    await queryInterface.sequelize.query(
      'ALTER TABLE "documents" VALIDATE CONSTRAINT "documents_deletedById_fkey";'
    );

    // Serves the trash query. Partial so that it only covers deleted documents
    // rather than the whole table.
    await queryInterface.sequelize.query(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "documents_deleted_by_id" ON "documents" ("deletedById") WHERE "deletedAt" IS NOT NULL;'
    );

    // Indexes only the rows the backfill has left to do, so it shrinks as the
    // loop runs and each batch reads its own rows and nothing else. Without it
    // every batch re-reads the rows already written, which turns the loop
    // quadratic on a large table.
    await queryInterface.sequelize.query(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "documents_deleted_by_backfill" ON "documents" ("id") WHERE "deletedAt" IS NOT NULL AND "deletedById" IS NULL;'
    );

    // Written in batches, each its own transaction, so that no single statement
    // locks a large number of rows.
    let rowCount = 1;
    let total = 0;

    while (rowCount) {
      const [, metadata] = await queryInterface.sequelize.query(`
WITH rows AS (
  SELECT "id" FROM "documents"
  WHERE "deletedAt" IS NOT NULL AND "deletedById" IS NULL
  ORDER BY "id"
  LIMIT ${BATCH_SIZE}
)
UPDATE "documents"
SET "deletedById" = "lastModifiedById"
WHERE EXISTS (SELECT 1 FROM rows WHERE "documents"."id" = rows."id")
      `);

      rowCount = metadata.rowCount;
      total += rowCount;
      if (rowCount) {
        console.log(`Backfilling documents.deletedById… ${total}`);
      }
    }

    await queryInterface.sequelize.query(
      'DROP INDEX CONCURRENTLY IF EXISTS "documents_deleted_by_backfill";'
    );
  },

  async down(queryInterface) {
    // Dropping the column takes the index and the foreign key with it.
    await queryInterface.sequelize.query(
      'ALTER TABLE "documents" DROP COLUMN IF EXISTS "deletedById";'
    );
  },
};
