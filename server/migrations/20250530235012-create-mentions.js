module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("mentions", {
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
      mentionedUserId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
        },
      },
      mentionType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      mentionId: {
        type: Sequelize.STRING,
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
    await queryInterface.addIndex("mentions", ["mentionedUserId"]);
    await queryInterface.addIndex("mentions", ["documentId"]);
    await queryInterface.addIndex("mentions", ["mentionId", "mentionType"]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("mentions");
  },
};

