module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("users", "username", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("users", "username", {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },
};
