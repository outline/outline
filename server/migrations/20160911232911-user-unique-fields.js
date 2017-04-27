module.exports = {
  up: function(queryInterface, Sequelize) {
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

  down: function(queryInterface, Sequelize) {
    queryInterface.changeColumn('users', 'email', {
      type: Sequelize.STRING,
      unique: false,
      allowNull: true,
    });

    queryInterface.changeColumn('users', 'username', {
      type: Sequelize.STRING,
      unique: false,
      allowNull: true,
    });
  },
};
