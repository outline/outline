module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("atlases", "deletedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("documents", "deletedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("atlases", "deletedAt");
    await queryInterface.removeColumn("documents", "deletedAt");
  },
};
