'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.removeConstraint("user_authentications", "user_authentications_providerId_key");
    await queryInterface.addConstraint("user_authentications", {
      type: 'unique',
      fields: ["providerId", "userId"],
      name: "user_authentications_providerId_userId_uk"
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeConstraint("user_authentications", "user_authentications_providerId_userId_uk");
    await queryInterface.addConstraint("user_authentications", {
      type: 'unique',
      fields: ["providerId"],
      name: "user_authentications_providerId_key"
    });
  }
};
