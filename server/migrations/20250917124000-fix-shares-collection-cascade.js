"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop the existing foreign key constraint
    await queryInterface.sequelize.query(
      `ALTER TABLE "shares" DROP CONSTRAINT "shares_collectionId_fkey"`
    );

    // Add the foreign key constraint with CASCADE delete
    await queryInterface.sequelize.query(`
      ALTER TABLE "shares"
      ADD CONSTRAINT "shares_collectionId_fkey" 
      FOREIGN KEY("collectionId") 
      REFERENCES "collections" ("id")
      ON DELETE CASCADE
    `);
  },

  async down(queryInterface, Sequelize) {
    // Drop the cascade constraint
    await queryInterface.sequelize.query(
      `ALTER TABLE "shares" DROP CONSTRAINT "shares_collectionId_fkey"`
    );

    // Add back the original constraint without cascade
    await queryInterface.sequelize.query(`
      ALTER TABLE "shares"
      ADD CONSTRAINT "shares_collectionId_fkey" 
      FOREIGN KEY("collectionId") 
      REFERENCES "collections" ("id")
      ON DELETE NO ACTION
    `);
  },
};
