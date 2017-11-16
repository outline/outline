module.exports = {
  up: function(queryInterface, Sequelize) {
    // Remove old indeces
    queryInterface.removeIndex('documents', ['urlId']);
    queryInterface.removeIndex('documents', ['id', 'atlasId']);
    queryInterface.removeIndex('documents', ['id', 'teamId']);
    queryInterface.removeIndex('documents', ['parentDocumentId', 'atlasId']);

    queryInterface.removeIndex('atlases', ['id', 'teamId']);

    // Add new ones
    queryInterface.addIndex('documents', ['id', 'deletedAt']);
    queryInterface.addIndex('documents', ['urlId', 'deletedAt']);
    queryInterface.addIndex('documents', ['id', 'atlasId', 'deletedAt']);
    queryInterface.addIndex('documents', ['id', 'teamId', 'deletedAt']);
    queryInterface.addIndex('documents', [
      'parentDocumentId',
      'atlasId',
      'deletedAt',
    ]);

    queryInterface.addIndex('atlases', ['id', 'deletedAt']);
    queryInterface.addIndex('atlases', ['id', 'teamId', 'deletedAt']);
  },

  down: function(queryInterface, Sequelize) {
    queryInterface.addIndex('documents', ['urlId']);
    queryInterface.addIndex('documents', ['id', 'atlasId']);
    queryInterface.addIndex('documents', ['id', 'teamId']);
    queryInterface.addIndex('documents', ['parentDocumentId', 'atlasId']);

    queryInterface.addIndex('atlases', ['id', 'teamId']);

    queryInterface.removeIndex('documents', ['id', 'deletedAt']);
    queryInterface.removeIndex('documents', ['urlId', 'deletedAt']);
    queryInterface.removeIndex('documents', ['id', 'atlasId', 'deletedAt']);
    queryInterface.removeIndex('documents', ['id', 'teamId', 'deletedAt']);
    queryInterface.removeIndex('documents', [
      'parentDocumentId',
      'atlasId',
      'deletedAt',
    ]);

    queryInterface.removeIndex('atlases', ['id', 'deletedAt']);
    queryInterface.removeIndex('atlases', ['id', 'teamId', 'deletedAt']);
  },
};
