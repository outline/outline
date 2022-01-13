module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("attachments", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      teamId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "teams",
        },
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
        allowNull: true,
        references: {
          model: "documents",
        },
      },
      key: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      url: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      contentType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      size: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      acl: {
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
    await queryInterface.addIndex("attachments", ["documentId"]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("attachments");
  },
};
