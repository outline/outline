module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.removeColumn('collections', 'navigationTree');
  },

  down: function(queryInterface, Sequelize) {
    queryInterface.addColumn('collections', 'navigationTree', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
  },
};
