'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.removeConstraint("authentication_providers", "authentication_providers_providerId_key");
    await queryInterface.addConstraint("authentication_providers", {
      type: 'unique',
      fields: ["providerId", "teamId"],
      name: "authentication_providers_providerId_teamId_uk"
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeConstraint("authentication_providers", "authentication_providers_providerId_teamId_uk");
    await queryInterface.addConstraint("authentication_providers", {
      type: 'unique',
      fields: ["providerId"],
      name: "authentication_providers_providerId_key"
    });
  }
};
