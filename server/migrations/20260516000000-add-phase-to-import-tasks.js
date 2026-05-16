"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("import_tasks", "phase", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "page",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("import_tasks", "phase");
  },
};
