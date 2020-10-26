module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface
      .createTable('follows', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
        },
        requestedDocId: {
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
      });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('follows');
  },
};
