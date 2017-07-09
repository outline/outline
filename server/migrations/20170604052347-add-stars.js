module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface
      .createTable('stars', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
        },
        documentId: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      })
      .then(() => {
        queryInterface.addIndex('stars', ['documentId', 'userId'], {
          indicesType: 'UNIQUE',
        });
      });
  },

  down: function(queryInterface, Sequelize) {
    queryInterface.removeIndex('stars', ['documentId', 'userId']).then(() => {
      queryInterface.dropTable('stars');
    });
  },
};
