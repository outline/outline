'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.addColumn("users", "preferences", {
      type: Sequelize.JSONB,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.removeColumn("users", "preferences");
  }
};
