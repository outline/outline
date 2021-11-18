module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("revisions", {
      id: {
        type: "UUID",
        allowNull: false,
        primaryKey: true,
      },
      title: {
        type: "CHARACTER VARYING",
        allowNull: false,
      },
      text: {
        type: "TEXT",
        allowNull: true,
      },
      html: {
        type: "TEXT",
        allowNull: true,
      },
      preview: {
        type: "TEXT",
        allowNull: true,
      },
      createdAt: {
        type: "TIMESTAMP WITH TIME ZONE",
        allowNull: false,
      },
      updatedAt: {
        type: "TIMESTAMP WITH TIME ZONE",
        allowNull: false,
      },
      userId: {
        type: "UUID",
        allowNull: false,
        references: {
          model: "users",
        },
      },
      documentId: {
        type: "UUID",
        allowNull: false,
        references: {
          model: "documents",
          onDelete: "CASCADE",
        },
      },
    });
    await queryInterface.addColumn("documents", "lastModifiedById", {
      type: "UUID",
      allowNull: false,
      references: {
        model: "users",
      },
    });
    await queryInterface.addColumn("documents", "revisionCount", {
      type: "INTEGER",
      defaultValue: 0,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("revisions");
    await queryInterface.removeColumn("documents", "lastModifiedById");
    await queryInterface.removeColumn("documents", "revisionCount");
  },
};
