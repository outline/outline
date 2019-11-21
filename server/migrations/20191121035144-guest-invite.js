module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('teams', 'guestSignin', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('teams', 'guestSignin');
  },
};