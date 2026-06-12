"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn("teams", "collaborativeEditing");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("teams", "collaborativeEditing", {
      type: Sequelize.BOOLEAN,
    });
  },
};
