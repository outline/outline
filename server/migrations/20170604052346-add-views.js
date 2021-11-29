module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("views", {
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
    await queryInterface.addIndex("views", ["documentId", "userId"], {
      indicesType: "UNIQUE",
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex("views", ["documentId", "userId"]);
    await queryInterface.dropTable("views");
  },
};
