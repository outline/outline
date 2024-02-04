"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("events", "changes", {
      type: Sequelize.JSONB,
      allowNull: true,
    });
    
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("events", "changes");
  },
};
