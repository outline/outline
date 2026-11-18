"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Creates the database schema as of Outline v1.3.0 in one step. It replaces
 * the individual migrations listed in baseline/migrations.json, which were
 * removed from the repository.
 *
 * - On an empty database the schema is created and the replaced migrations
 *   are recorded as applied.
 * - On a database that already has all replaced migrations nothing changes.
 * - On any other database the migration fails, as an intermediate upgrade
 *   is necessary first.
 */

const minimumVersion = "v1.3.0";
const maximumVersion = "v1.10.1";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const names = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "baseline", "migrations.json"),
        "utf8"
      )
    );
    const [rows] = await queryInterface.sequelize.query(
      `SELECT name FROM "SequelizeMeta"`
    );
    const applied = new Set(rows.map((row) => row.name));
    const missing = names.filter((name) => !applied.has(name));

    if (missing.length === 0) {
      return;
    }

    const [[{ teams }]] = await queryInterface.sequelize.query(
      `SELECT to_regclass('teams') AS teams`
    );

    if (applied.size > 0 || teams) {
      throw new Error(
        `This database was last migrated by a version of Outline older than ${minimumVersion}, it is missing ${missing.length} migration(s) and cannot be upgraded directly to this version.\n\n` +
          `Upgrade to a version between ${minimumVersion} and ${maximumVersion} first and allow it to complete the database migrations, then upgrade to this version.`
      );
    }

    const schema = fs.readFileSync(
      path.join(__dirname, "baseline", "schema.sql"),
      "utf8"
    );

    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(schema, { transaction });
      await queryInterface.bulkInsert(
        "SequelizeMeta",
        names.map((name) => ({ name })),
        { transaction }
      );
    });
  },

  async down() {
    throw new Error("The baseline schema migration cannot be reverted.");
  },
};
