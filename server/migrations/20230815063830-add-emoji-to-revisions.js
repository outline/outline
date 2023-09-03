'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("revisions", "emoji", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down (queryInterface) {
    await queryInterface.removeColumn("revisions", "emoji");
  }
};
