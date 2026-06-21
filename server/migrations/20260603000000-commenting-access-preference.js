"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Convert the legacy boolean "commenting" team preference into the
    // CommentingAccess enum: false -> "none", true -> "members".
    await queryInterface.sequelize.query(`
      UPDATE teams
      SET preferences = jsonb_set(preferences, '{commenting}', '"none"')
      WHERE preferences -> 'commenting' = 'false'::jsonb
    `);
    await queryInterface.sequelize.query(`
      UPDATE teams
      SET preferences = jsonb_set(preferences, '{commenting}', '"members"')
      WHERE preferences -> 'commenting' = 'true'::jsonb
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE teams
      SET preferences = jsonb_set(preferences, '{commenting}', 'false')
      WHERE preferences -> 'commenting' = '"none"'::jsonb
    `);
    await queryInterface.sequelize.query(`
      UPDATE teams
      SET preferences = jsonb_set(preferences, '{commenting}', 'true')
      WHERE preferences -> 'commenting' IN ('"members"'::jsonb, '"everyone"'::jsonb)
    `);
  },
};
