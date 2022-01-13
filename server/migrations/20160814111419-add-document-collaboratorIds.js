module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("documents", "collaboratorIds", {
      type: Sequelize.ARRAY(Sequelize.UUID),
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("documents", "collaboratorIds");
  },
};
