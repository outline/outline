"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "notifications",
        "slackSentAt",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn("notifications", "slackSentAt", {
        transaction,
      });
    });
  },
};
