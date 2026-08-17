"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("documents", "personalOwnerId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "set null",
    });

    await queryInterface.sequelize.query(`
      CREATE INDEX documents_personal_owner_id
      ON documents ("personalOwnerId")
      WHERE "personalOwnerId" IS NOT NULL AND "deletedAt" IS NULL
    `);

    // A published document lives in exactly one place: a collection, or a
    // person's own space. Drafts and templates live in neither.
    await queryInterface.sequelize.query(`
      ALTER TABLE documents ADD CONSTRAINT documents_single_home CHECK (
        "publishedAt" IS NULL
        OR template = true
        OR (("collectionId" IS NULL) <> ("personalOwnerId" IS NULL))
      )
    `);
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
