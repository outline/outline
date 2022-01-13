module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("documents", "isWelcome", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("documents", "isWelcome");
  },
};
