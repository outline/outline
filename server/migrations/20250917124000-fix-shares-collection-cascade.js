"use strict";

const tableName = "shares";
// The foreign key constraint name for collectionId in shares table
const constraintNames = ["shares_collectionId_fkey"];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    let error;

    for (const constraintName of constraintNames) {
      try {
        // Drop the existing foreign key constraint
        await queryInterface.sequelize.query(
          `ALTER TABLE "${tableName}" DROP CONSTRAINT "${constraintName}"`
        );

        // Add the foreign key constraint with CASCADE delete
        await queryInterface.sequelize.query(`
          ALTER TABLE "${tableName}"
          ADD CONSTRAINT "${constraintName}" 
          FOREIGN KEY("collectionId") 
          REFERENCES "collections" ("id")
          ON DELETE CASCADE
        `);
        return;
      } catch (err) {
        error = err;
      }
    }

    throw error;
  },

  async down(queryInterface, Sequelize) {
    let error;

    for (const constraintName of constraintNames) {
      try {
        // Drop the cascade constraint
        await queryInterface.sequelize.query(
          `ALTER TABLE "${tableName}" DROP CONSTRAINT "${constraintName}"`
        );

        // Add back the original constraint without cascade
        await queryInterface.sequelize.query(`
          ALTER TABLE "${tableName}"
          ADD CONSTRAINT "${constraintName}" 
          FOREIGN KEY("collectionId") 
          REFERENCES "collections" ("id")
          ON DELETE NO ACTION
        `);
        return;
      } catch (err) {
        error = err;
      }
    }

    throw error;
  },
};
