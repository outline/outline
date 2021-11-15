module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("collections", "sharing", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("collections", "sharing");
  },
};
