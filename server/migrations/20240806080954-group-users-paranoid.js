'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM group_users WHERE "deletedAt" IS NOT NULL`
    );
  },

  async down () {
    // No reverting possible
  }
};
