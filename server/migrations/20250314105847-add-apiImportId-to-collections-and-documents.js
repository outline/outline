"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn(
        "collections",
        "apiImportId",
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "imports",
          },
        },
        { transaction }
      );
      await queryInterface.addColumn(
        "documents",
        "apiImportId",
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "imports",
          },
        },
        { transaction }
      );

      await queryInterface.addIndex("collections", ["apiImportId"], {
        transaction,
      });
      await queryInterface.addIndex("documents", ["apiImportId"], {
        transaction,
      });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.removeIndex("collections", [
        "apiImportId",
        { transaction },
      ]);
      await queryInterface.removeIndex("documents", [
        "apiImportId",
        { transaction },
      ]);
      await queryInterface.removeColumn("collections", "apiImportId", {
        transaction,
      });
      await queryInterface.removeColumn("documents", "apiImportId", {
        transaction,
      });
    });
  },
};
