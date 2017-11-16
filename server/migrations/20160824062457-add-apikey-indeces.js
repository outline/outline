module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.addIndex('apiKeys', ['secret', 'deletedAt']);
    queryInterface.addIndex('apiKeys', ['userId', 'deletedAt']);
  },

  down: function(queryInterface, Sequelize) {
    queryInterface.removeIndex('apiKeys', ['secret', 'deletedAt']);
    queryInterface.removeIndex('apiKeys', ['userId', 'deletedAt']);
  },
};
