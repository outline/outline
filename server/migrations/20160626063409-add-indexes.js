module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex("documents", ["urlId"]);
    await queryInterface.addIndex("documents", ["id", "atlasId"]);
    await queryInterface.addIndex("documents", ["id", "teamId"]);
    await queryInterface.addIndex("documents", ["parentDocumentId", "atlasId"]);
    await queryInterface.addIndex("atlases", ["id", "teamId"]);
    await queryInterface.addIndex("teams", ["slackId"]);
    await queryInterface.addIndex("users", ["slackId"]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex("documents", ["urlId"]);
    await queryInterface.removeIndex("documents", ["id", "atlasId"]);
    await queryInterface.removeIndex("documents", ["id", "teamId"]);
    await queryInterface.removeIndex("documents", [
      "parentDocumentId",
      "atlasId",
    ]);
    await queryInterface.removeIndex("atlases", ["id", "teamId"]);
    await queryInterface.removeIndex("teams", ["slackId"]);
    await queryInterface.removeIndex("users", ["slackId"]);
  },
};
