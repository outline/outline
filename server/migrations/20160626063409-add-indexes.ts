module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex("documents", ["urlId"]);
    await queryInterface.addIndex("documents", ["id", "atlasId"]);
    await queryInterface.addIndex("documents", ["id", "teamId"]);
    await queryInterface.addIndex("documents", ["parentDocumentId", "atlasId"]);
    await queryInterface.addIndex("atlases", ["id", "teamId"]);
    await queryInterface.addIndex("teams", ["slackId"]);
    await queryInterface.addIndex("users", ["slackId"]);
  },
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
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
