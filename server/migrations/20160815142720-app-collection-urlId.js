'use strict';

module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.addColumn('atlases', 'urlId', {
      type: Sequelize.STRING,
      unique: true,
    });
  },

  down: function(queryInterface, Sequelize) {
    queryInterface.removeColumn('atlases', 'urlId');
  },
};
