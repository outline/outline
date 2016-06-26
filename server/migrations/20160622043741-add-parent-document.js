'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    queryInterface.addColumn(
      'documents',
      'parentDocumentId',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "documents",
          key: "id",
        }
      }
    );
  },

  down: function (queryInterface, Sequelize) {
    queryInterface.removeColumn('documents', 'parentDocumentId');
  }
};
