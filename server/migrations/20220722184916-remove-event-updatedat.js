'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.removeColumn("events", "updatedAt");
  },
  async down (queryInterface, Sequelize) {
    await queryInterface.addColumn("events", "updatedAt", {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW'),
    });
  }
};
