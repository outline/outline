'use strict';

module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.addIndex('documents', ['urlId']);
    queryInterface.addIndex('documents', ['id', 'atlasId']);
    queryInterface.addIndex('documents', ['id', 'teamId']);
    queryInterface.addIndex('documents', ['parentDocumentId', 'atlasId']);

    queryInterface.addIndex('atlases', ['id', 'teamId']);

    queryInterface.addIndex('teams', ['slackId']);

    queryInterface.addIndex('users', ['slackId']);
  },

  down: function(queryInterface, Sequelize) {
    queryInterface.removeIndex('documents', ['urlId']);
    queryInterface.removeIndex('documents', ['id', 'atlasId']);
    queryInterface.removeIndex('documents', ['id', 'teamId']);
    queryInterface.removeIndex('documents', ['parentDocumentId', 'atlasId']);

    queryInterface.removeIndex('atlases', ['id', 'teamId']);

    queryInterface.removeIndex('teams', ['slackId']);

    queryInterface.removeIndex('users', ['slackId']);
  },
};
