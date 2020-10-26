'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('requested_docs', {
      id: {
        type: 'UUID',
        allowNull: false,
        primaryKey: true,
      },
      title: {
        type: 'CHARACTER VARYING',
        allowNull: false,
      },
      like: {
        type: 'INTEGER',
        defaultValue: 0,
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
        allowNull: true
      },
      collectionId: {
        type: 'UUID',
        allowNull: true
      },
    });

  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('requested_docs');
  },
};
