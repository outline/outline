module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("users", "avatarUrl", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("users", "avatarUrl");
  },
};
