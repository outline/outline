module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("teams", "documentEmbeds", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("teams", "documentEmbeds");
  },
};
