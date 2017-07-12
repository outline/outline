module.exports = {
  up: (queryInterface, Sequelize) => {
    queryInterface.removeConstraint('users', 'email_unique_idx');
    queryInterface.removeConstraint('users', 'username_unique_idx');
  },

  down: (queryInterface, Sequelize) => {
    queryInterface.changeColumn('users', 'email', {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
    });
    queryInterface.changeColumn('users', 'username', {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
    });
  },
};
