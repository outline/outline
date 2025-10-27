"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("collections", "displayPreferences", {
      type: Sequelize.JSONB,
      defaultValue: {},
    });

    await queryInterface.sequelize.query(`
      UPDATE collections 
      SET "displayPreferences" = '{}'::jsonb 
      WHERE "displayPreferences" IS NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("collections", "displayPreferences");
  },
};
