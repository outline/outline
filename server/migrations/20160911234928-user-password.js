module.exports = {
  up: (queryInterface, Sequelize) => {
    queryInterface.addColumn('users', 'passwordDigest', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: (queryInterface, _Sequelize) => {
    queryInterface.removeColumn('users', 'passwordDigest');
  },
};
