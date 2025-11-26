"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex("documents", ["popularityScore"], {
      concurrently: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("documents", ["popularityScore"]);
  },
};
