"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "documents",
        "properties",
        {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: {},
        },
        { transaction }
      );

      await queryInterface.sequelize.query(
        `CREATE INDEX "documents_properties_gin" ON "documents" USING gin ("properties")`,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS "documents_properties_gin"`,
        { transaction }
      );
      await queryInterface.removeColumn("documents", "properties", {
        transaction,
      });
    });
  },
};
