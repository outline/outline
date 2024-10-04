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

    if (process.env.DEPLOYMENT === "hosted") {
      return;
    }

    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `UPDATE documents SET icon = emoji`,
        {
          transaction,
          type: queryInterface.sequelize.QueryTypes.UPDATE,
        }
      );
      await queryInterface.sequelize.query(
        `UPDATE revisions SET icon = emoji`,
        {
          transaction,
          type: queryInterface.sequelize.QueryTypes.UPDATE,
        }
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
