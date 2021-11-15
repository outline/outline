module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("documents", "atlasId", {
      type: Sequelize.UUID,
      allowNull: true,
      onDelete: "cascade",
      references: {
        model: "collections",
      },
    });
    await queryInterface.changeColumn("documents", "userId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "users",
      },
    });
    await queryInterface.changeColumn("documents", "parentDocumentId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "documents",
      },
    });
    await queryInterface.changeColumn("documents", "teamId", {
      type: Sequelize.UUID,
      allowNull: true,
      onDelete: "cascade",
      references: {
        model: "teams",
      },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      'ALTER TABLE documents DROP CONSTRAINT "atlasId_foreign_idx";'
    );
    await queryInterface.removeIndex("documents", "atlasId_foreign_idx");
    await queryInterface.sequelize.query(
      'ALTER TABLE documents DROP CONSTRAINT "userId_foreign_idx";'
    );
    await queryInterface.removeIndex("documents", "userId_foreign_idx");
    await queryInterface.sequelize.query(
      'ALTER TABLE documents DROP CONSTRAINT "parentDocumentId_foreign_idx";'
    );
    await queryInterface.removeIndex(
      "documents",
      "parentDocumentId_foreign_idx"
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE documents DROP CONSTRAINT "teamId_foreign_idx";'
    );
    await queryInterface.removeIndex("documents", "teamId_foreign_idx");
  },
};
