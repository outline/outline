module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove old indeces
    await queryInterface.removeIndex("documents", ["urlId"]);
    await queryInterface.removeIndex("documents", ["id", "atlasId"]);
    await queryInterface.removeIndex("documents", ["id", "teamId"]);
    await queryInterface.removeIndex("documents", [
      "parentDocumentId",
      "atlasId",
    ]);
    await queryInterface.removeIndex("atlases", ["id", "teamId"]);
    // Add new ones
    await queryInterface.addIndex("documents", ["id", "deletedAt"]);
    await queryInterface.addIndex("documents", ["urlId", "deletedAt"]);
    await queryInterface.addIndex("documents", ["id", "atlasId", "deletedAt"]);
    await queryInterface.addIndex("documents", ["id", "teamId", "deletedAt"]);
    await queryInterface.addIndex("documents", [
      "parentDocumentId",
      "atlasId",
      "deletedAt",
    ]);
    await queryInterface.addIndex("atlases", ["id", "deletedAt"]);
    await queryInterface.addIndex("atlases", ["id", "teamId", "deletedAt"]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex("documents", ["urlId"]);
    await queryInterface.addIndex("documents", ["id", "atlasId"]);
    await queryInterface.addIndex("documents", ["id", "teamId"]);
    await queryInterface.addIndex("documents", ["parentDocumentId", "atlasId"]);
    await queryInterface.addIndex("atlases", ["id", "teamId"]);
    await queryInterface.removeIndex("documents", ["id", "deletedAt"]);
    await queryInterface.removeIndex("documents", ["urlId", "deletedAt"]);
    await queryInterface.removeIndex("documents", [
      "id",
      "atlasId",
      "deletedAt",
    ]);
    await queryInterface.removeIndex("documents", [
      "id",
      "teamId",
      "deletedAt",
    ]);
    await queryInterface.removeIndex("documents", [
      "parentDocumentId",
      "atlasId",
      "deletedAt",
    ]);
    await queryInterface.removeIndex("atlases", ["id", "deletedAt"]);
    await queryInterface.removeIndex("atlases", ["id", "teamId", "deletedAt"]);
  },
};
