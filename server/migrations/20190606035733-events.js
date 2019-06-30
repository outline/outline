module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('events', 'data', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
    await queryInterface.addColumn('events', 'actorId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
      },
    });
    await queryInterface.addColumn('events', 'modelId', {
      type: Sequelize.UUID,
      allowNull: true
    });
    await queryInterface.addIndex('events', ['name']);
    await queryInterface.addIndex('events', ['actorId']);
    await queryInterface.addIndex('events', ['teamId', 'collectionId']);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('events', 'data', {
      type: Sequelize.JSONB,
      allowNull: false,
    });
    await queryInterface.removeColumn('events', 'actorId');
    await queryInterface.removeColumn('events', 'modelId');

    await queryInterface.removeIndex('events', ['name']);
    await queryInterface.removeIndex('events', ['actorId']);
    await queryInterface.removeIndex('events', ['teamId', 'collectionId']);
  }
}