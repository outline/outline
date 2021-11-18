module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("shares", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
        },
      },
      teamId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "teams",
        },
      },
      documentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "documents",
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
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("shares");
  },
};
