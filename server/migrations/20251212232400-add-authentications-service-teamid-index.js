"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex("authentications", ["teamId", "service"], {
      name: "authentications_team_id_service",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      "authentications",
      "authentications_team_id_service"
    );
  },
};
