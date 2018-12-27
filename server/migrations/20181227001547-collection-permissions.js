module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('collection_users', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      collectionId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'collections',
        },
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
        },
      },
      permission: {
        type: Sequelize.STRING,
        allowNull: false
      },
      createdById: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
        },
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      }
    });

    await queryInterface.addIndex('collection_users', ['collectionId', 'userId']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('collection_users', ['collectionId', 'userId']);
  },
};
