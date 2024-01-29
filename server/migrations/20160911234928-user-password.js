module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("users", "passwordDigest", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
  down: async (queryInterface, _Sequelize) => {
    await queryInterface.removeColumn("users", "passwordDigest");
  },
};
