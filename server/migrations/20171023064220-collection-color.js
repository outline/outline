module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.addColumn('collections', 'color', {
      type: Sequelize.TEXT,
    });
  },

  down: function(queryInterface, Sequelize) {
    queryInterface.removeColumn('collections', 'color');
  },
};
