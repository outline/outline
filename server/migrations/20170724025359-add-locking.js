module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.addColumn('documents', 'lockedAt', {
      type: Sequelize.DATE,
    });
    queryInterface.addColumn('documents', 'lockedBy', {
      type: Sequelize.UUID,
    });
  },
  down: function(queryInterface, Sequelize) {
    queryInterface.removeColumn('documents', 'lockedAt');
    queryInterface.removeColumn('documents', 'lockedBy');
  },
};
