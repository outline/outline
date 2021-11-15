module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("users", "deletedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("teams", "deletedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("users", "deletedAt");
    await queryInterface.removeColumn("teams", "deletedAt");
  },
};
