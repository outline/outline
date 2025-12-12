"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex("authentications", ["service", "teamId"], {
      name: "authentications_service_team_id",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      "authentications",
      "authentications_service_team_id"
    );
  },
};
