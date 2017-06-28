module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.createTable('views', {
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
      count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
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
    queryInterface.addIndex('views', ['documentId', 'userId'], {
      indicesType: 'UNIQUE',
    });
  },

  down: function(queryInterface, Sequelize) {
    queryInterface.removeIndex('views', ['documentId', 'userId']);
    queryInterface.dropTable('views');
  },
};
