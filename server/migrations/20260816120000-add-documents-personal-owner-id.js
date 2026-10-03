"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Adding a nullable column with a foreign key takes only a brief lock, as
    // there are no existing rows to validate.
    await queryInterface.addColumn("documents", "personalOwnerId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "set null",
    });

    // CONCURRENTLY so the build does not block writes to the table. It cannot
    // run inside a transaction.
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS documents_personal_owner_id
      ON documents ("personalOwnerId")
      WHERE "personalOwnerId" IS NOT NULL AND "deletedAt" IS NULL
    `);

    // A published document lives in exactly one place: a collection, or a
    // person's own space. Drafts and templates live in neither.
    //
    // NOT VALID makes the ADD CONSTRAINT a metadata-only change, and the
    // separate VALIDATE scans existing rows under a lock that does not block
    // reads or writes.
    await queryInterface.sequelize.query(`
      ALTER TABLE documents ADD CONSTRAINT documents_single_home CHECK (
        "publishedAt" IS NULL
        OR template = true
        OR (("collectionId" IS NULL) <> ("personalOwnerId" IS NULL))
      ) NOT VALID
    `);
    await queryInterface.sequelize.query(
      `ALTER TABLE documents VALIDATE CONSTRAINT documents_single_home`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_single_home`
    );
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS documents_personal_owner_id`
    );
    await queryInterface.removeColumn("documents", "personalOwnerId");
  },
};
