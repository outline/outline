module.exports = {
  up: (queryInterface, Sequelize) => {
    queryInterface.addColumn('documents', 'emoji', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: (queryInterface, _Sequelize) => {
    queryInterface.removeColumn('documents', 'emoji');
  },
};
