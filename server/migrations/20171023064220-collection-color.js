module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("collections", "color", {
      type: Sequelize.TEXT,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("collections", "color");
  },
};
