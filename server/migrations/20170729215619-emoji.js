module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("documents", "emoji", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
  down: async (queryInterface, _Sequelize) => {
    await queryInterface.removeColumn("documents", "emoji");
  },
};
