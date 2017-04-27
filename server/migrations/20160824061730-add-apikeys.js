'use strict';

module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.createTable('apiKeys', {
      id: {
        type: 'UUID',
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: 'CHARACTER VARYING',
        allowNull: true,
      },
      secret: {
        type: 'CHARACTER VARYING',
        allowNull: false,
        unique: true,
      },
      userId: {
        type: 'UUID',
        allowNull: true,
        // references: {
        //   model: 'users',
        //   key: 'id',
        // },
      },
      createdAt: {
        type: 'TIMESTAMP WITH TIME ZONE',
        allowNull: false,
      },
      updatedAt: {
        type: 'TIMESTAMP WITH TIME ZONE',
        allowNull: false,
      },
      deletedAt: {
        type: 'TIMESTAMP WITH TIME ZONE',
        allowNull: true,
      },
    });
  },

  down: function(queryInterface, Sequelize) {
    queryInterface.createTable('apiKeys');
  },
};
