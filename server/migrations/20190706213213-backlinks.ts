module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("backlinks", {
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
      documentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "documents",
        },
      },
      reverseDocumentId: {
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
    await queryInterface.addIndex("backlinks", ["documentId"]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("backlinks");
    await queryInterface.removeIndex("backlinks", ["documentId"]);
  },
};
