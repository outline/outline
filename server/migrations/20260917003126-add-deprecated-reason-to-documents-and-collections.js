module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const table of ["documents", "collections"]) {
        await queryInterface.addColumn(
          table,
          "deprecatedReason",
          { type: Sequelize.TEXT, allowNull: true },
          { transaction }
        );
      }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const table of ["collections", "documents"]) {
        await queryInterface.removeColumn(table, "deprecatedReason", {
          transaction,
        });
      }
    });
  },
};
