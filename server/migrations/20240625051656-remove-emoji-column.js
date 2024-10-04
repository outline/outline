"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.removeColumn("documents", "emoji", { transaction });
      await queryInterface.removeColumn("revisions", "emoji", { transaction });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn(
        "documents",
        "emoji",
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        {
          transaction,
        }
      );
      await queryInterface.addColumn(
        "revisions",
        "emoji",
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        {
          transaction,
        }
      );
    });
  },
};
