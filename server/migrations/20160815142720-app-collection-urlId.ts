module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("atlases", "urlId", {
      type: Sequelize.STRING,
      unique: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("atlases", "urlId");
  },
};
