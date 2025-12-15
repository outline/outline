"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("teams", "retentionFilter", {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addColumn("collections", "retentionFilter", {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("collections", "retentionFilter");
    await queryInterface.removeColumn("teams", "retentionFilter");
  },
};
