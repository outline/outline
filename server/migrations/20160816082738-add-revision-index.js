'use strict';

module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.addIndex('revisions', ['documentId']);
  },

  down: function(queryInterface, Sequelize) {
    queryInterface.removeIndex('revisions', ['documentId']);
  },
};
