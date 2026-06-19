"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "document_insights",
        "period",
        {
          type: Sequelize.ENUM("day", "week"),
          allowNull: false,
          defaultValue: "day",
        },
        { transaction }
      );

      await queryInterface.removeIndex(
        "document_insights",
        ["documentId", "date"],
        { transaction }
      );

      await queryInterface.addIndex(
        "document_insights",
        ["documentId", "date", "period"],
        { unique: true, transaction }
      );
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex(
        "document_insights",
        ["documentId", "date", "period"],
        { transaction }
      );

      await queryInterface.addIndex(
        "document_insights",
        ["documentId", "date"],
        { unique: true, transaction }
      );

      await queryInterface.removeColumn("document_insights", "period", {
        transaction,
      });

      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_document_insights_period"',
        { transaction }
      );
    });
  },
};
