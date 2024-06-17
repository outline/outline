"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn(
        "documents",
        "icon",
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
        "icon",
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        {
          transaction,
        }
      );
      await queryInterface.addColumn(
        "documents",
        "color",
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.addColumn(
        "revisions",
        "color",
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.removeColumn("documents", "icon", { transaction });
      await queryInterface.removeColumn("revisions", "icon", { transaction });
      await queryInterface.removeColumn("documents", "color", { transaction });
      await queryInterface.removeColumn("revisions", "color", { transaction });
    });
  },
};
