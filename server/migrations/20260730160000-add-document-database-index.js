"use strict";

// stepping the final character keeps appended keys short, see
// Document.nextDatabaseIndex
const FIRST_INDEX = "P";
const LAST_CHARACTER = 126;

/** Returns a fractional index sorting immediately after the given one. */
function nextIndex(previous) {
  if (!previous) {
    return FIRST_INDEX;
  }
  const code = previous.charCodeAt(previous.length - 1);
  return code < LAST_CHARACTER
    ? previous.slice(0, -1) + String.fromCharCode(code + 1)
    : previous + FIRST_INDEX;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "documents",
        "databaseIndex",
        {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.sequelize.query(
        `CREATE INDEX "documents_database_id_database_index" ON "documents" ("databaseId", "databaseIndex" collate "C")`,
        { transaction }
      );

      // give the rows that already exist an index, in the order they were
      // listed in before this column existed, so that they can be reordered
      // relative to one another without first having to be dragged
      const [rows] = await queryInterface.sequelize.query(
        `SELECT id, "databaseId" FROM documents WHERE "databaseId" IS NOT NULL ORDER BY "databaseId", "createdAt" ASC`,
        { transaction }
      );

      const previous = {};
      for (const row of rows) {
        const index = nextIndex(previous[row.databaseId]);
        previous[row.databaseId] = index;

        await queryInterface.sequelize.query(
          `UPDATE documents SET "databaseIndex" = :index WHERE id = :id`,
          { replacements: { index, id: row.id }, transaction }
        );
      }
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS "documents_database_id_database_index"`,
        { transaction }
      );
      await queryInterface.removeColumn("documents", "databaseIndex", {
        transaction,
      });
    });
  },
};
