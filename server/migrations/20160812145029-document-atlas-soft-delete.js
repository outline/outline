'use strict';

module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.addColumn('atlases', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    queryInterface.addColumn('documents', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: function(queryInterface, Sequelize) {
    queryInterface.removeColumn('atlases', 'deletedAt');
    queryInterface.removeColumn('documents', 'deletedAt');
  },
};
