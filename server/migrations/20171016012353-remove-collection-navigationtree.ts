module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("collections", "navigationTree");
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("collections", "navigationTree", {
      type: Sequelize.JSONB,
      allowNull: true,
    });
  },
};
