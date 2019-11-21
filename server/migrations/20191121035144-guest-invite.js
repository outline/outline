module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('teams', 'guestSignin', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
    await queryInterface.addColumn('users', 'lastSigninEmailSentAt', {
      type: Sequelize.DATE
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('teams', 'guestSignin');
    await queryInterface.removeColumn('users', 'lastSigninEmailSentAt');
  },
};