'use strict';

module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.createTable('revisions', {
      id: {
        type: 'UUID',
        allowNull: false,
        primaryKey: true,
      },
      title: {
        type: 'CHARACTER VARYING',
        allowNull: false,
      },
      text: {
        type: 'TEXT',
        allowNull: true,
      },
      html: {
        type: 'TEXT',
        allowNull: true,
      },
      preview: {
        type: 'TEXT',
        allowNull: true,
      },
      createdAt: {
        type: 'TIMESTAMP WITH TIME ZONE',
        allowNull: false,
      },
      updatedAt: {
        type: 'TIMESTAMP WITH TIME ZONE',
        allowNull: false,
      },
      userId: {
        type: 'UUID',
        allowNull: false,
        references: {
          model: 'users',
        },
      },
      documentId: {
        type: 'UUID',
        allowNull: false,
        references: {
          model: 'documents',
          onDelete: 'CASCADE',
        },
      },
    });

    queryInterface.addColumn('documents', 'lastModifiedById', {
      type: 'UUID',
      allowNull: false,
      references: {
        model: 'users',
      },
    });

    queryInterface.addColumn('documents', 'revisionCount', {
      type: 'INTEGER',
      defaultValue: 0,
    });
  },

  down: function(queryInterface, Sequelize) {
    queryInterface.dropTable('revisions');

    queryInterface.removeColumn('documents', 'lastModifiedById');
    queryInterface.removeColumn('documents', 'revisionCount');
  },
};
