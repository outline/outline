"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Update any NULL team names to "Wiki" before removing nullable constraint
    await queryInterface.sequelize.query(
      `UPDATE teams SET name = 'Wiki' WHERE name IS NULL;`
    );

    await queryInterface.changeColumn("teams", "name", {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("teams", "name", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
