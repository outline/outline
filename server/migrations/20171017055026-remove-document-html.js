module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.removeColumn('documents', 'html');
    queryInterface.removeColumn('documents', 'preview');
    queryInterface.removeColumn('revisions', 'html');
    queryInterface.removeColumn('revisions', 'preview');
  },

  down: function(queryInterface, Sequelize) {
    queryInterface.addColumn('documents', 'html', {
      type: Sequelize.TEXT,
    });
    queryInterface.addColumn('documents', 'preview', {
      type: Sequelize.TEXT,
    });
    queryInterface.addColumn('revisions', 'html', {
      type: Sequelize.TEXT,
    });
    queryInterface.addColumn('revisions', 'preview', {
      type: Sequelize.TEXT,
    });
  },
};
