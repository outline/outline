module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tags', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      teamId: {
        type: Sequelize.UUID,
        allowNull: false,
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
    await queryInterface.createTable('document_tags', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      tagId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tags',
        },
      },
      documentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'documents',
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
    await queryInterface.addIndex('tags', ['teamId']);
    await queryInterface.addIndex('document_tags', ['documentId']);
    await queryInterface.addIndex('document_tags', ['tagId']);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('document_tags', ['tagId']);
    await queryInterface.removeIndex('document_tags', ['documentId']);
    await queryInterface.removeIndex('tags', ['teamId']);
    await queryInterface.dropTable('document_tags');
    await queryInterface.dropTable('tags');
  }
}