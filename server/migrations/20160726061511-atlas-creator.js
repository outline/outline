module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("atlases", "creatorId", {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("atlases", "creatorId");
  },
};
