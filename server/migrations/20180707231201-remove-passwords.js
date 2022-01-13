module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("users", "passwordDigest");
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("users", "passwordDigest", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
