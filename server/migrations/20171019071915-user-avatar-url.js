module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.addColumn('users', 'avatarUrl', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  down: function(queryInterface, Sequelize) {
    queryInterface.removeColumn('users', 'avatarUrl');
  },
};
