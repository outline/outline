"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn(
        "shares",
        "collectionId",
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "collections",
          },
        },
        { transaction }
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE shares ALTER COLUMN "documentId" DROP NOT NULL;',
        { transaction }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.removeColumn("shares", "collectionId", {
        transaction,
      });
      await queryInterface.sequelize.query(
        'ALTER TABLE shares ALTER COLUMN "documentId" SET NOT NULL;',
        { transaction }
      );
    });
  },
};
