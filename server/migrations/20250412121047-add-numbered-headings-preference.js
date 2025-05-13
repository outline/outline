"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      UPDATE users 
      SET preferences = jsonb_set(
        COALESCE(preferences, '{}'::jsonb),
        '{numberedHeadings}',
        'false'::jsonb
      )
      WHERE preferences->>'numberedHeadings' IS NULL
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      UPDATE users 
      SET preferences = preferences - 'numberedHeadings'
      WHERE preferences ? 'numberedHeadings'
    `);
  },
};