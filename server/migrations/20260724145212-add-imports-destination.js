"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "imports",
        "collectionId",
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "collections",
            key: "id",
          },
          onDelete: "SET NULL",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "imports",
        "documentId",
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "documents",
            key: "id",
          },
          onDelete: "SET NULL",
        },
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn("imports", "collectionId", {
        transaction,
      });
      await queryInterface.removeColumn("imports", "documentId", {
        transaction,
      });
    });
  },
};
