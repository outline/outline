"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("import_tasks", "phase", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "page",
    });
    await queryInterface.addColumn("imports", "scratch", {
      type: Sequelize.JSONB,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("imports", "scratch");
    await queryInterface.removeColumn("import_tasks", "phase");
  },
};
