module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('users', 'email_unique_idx');
    await queryInterface.removeConstraint('users', 'username_unique_idx');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('users', 'email', {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
    });
    await queryInterface.changeColumn('users', 'username', {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
    });
  },
};
