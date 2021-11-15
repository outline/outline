module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("documents", "parentDocumentId", {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("documents", "parentDocumentId");
  },
};
