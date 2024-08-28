"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn(
        "notifications",
        "messageId",
        {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.addIndex("notifications", ["documentId", "userId"], {
        transaction,
      });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.removeColumn("notifications", "messageId", {
        transaction,
      });
      await queryInterface.removeIndex(
        "notifications",
        ["documentId", "userId"],
        { transaction }
      );
    });
  },
};
