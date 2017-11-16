module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.addColumn('documents', 'collaboratorIds', {
      type: Sequelize.ARRAY(Sequelize.UUID),
    });
  },
  down: function(queryInterface, Sequelize) {
    queryInterface.removeColumn('documents', 'collaboratorIds');
  },
};
