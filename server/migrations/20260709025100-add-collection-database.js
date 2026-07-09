"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "collections",
        "dataSchema",
        {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "collections",
        "views",
        {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn("collections", "dataSchema", {
        transaction,
      });
      await queryInterface.removeColumn("collections", "views", {
        transaction,
      });
    });
  },
};
