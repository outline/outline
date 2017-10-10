module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.createTable('events', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      data: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
        },
      },
      collectionId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'collections',
        },
      },
      teamId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'teams',
        },
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  down: function(queryInterface, Sequelize) {
    queryInterface.dropTable('events');
  },
};
