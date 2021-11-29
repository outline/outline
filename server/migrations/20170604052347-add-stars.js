module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("stars", {
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
    });
    await queryInterface.addIndex("stars", ["documentId", "userId"], {
      indicesType: "UNIQUE",
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex("stars", ["documentId", "userId"]);
    await queryInterface.dropTable("stars");
  },
};
