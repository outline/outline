module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.addColumn('atlases', 'creatorId', {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },

  down: function(queryInterface, Sequelize) {
    queryInterface.removeColumn('atlases', 'creatorId');
  },
};
