module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("users", "serviceId", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("users", "serviceId", {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },
};
