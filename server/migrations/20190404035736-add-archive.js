module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("documents", "archivedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("documents", "archivedAt");
  },
};
