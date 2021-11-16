module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("documents", "publishedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    const [documents, metaData] = await queryInterface.sequelize.query(
      `SELECT * FROM documents`
    );

    for (const document of documents) {
      await queryInterface.sequelize.query(`
        update documents
        set "publishedAt" = '${new Date(document.createdAt).toISOString()}'
        where id  = '${document.id}'
      `);
    }

    await queryInterface.removeIndex("documents", ["id", "atlasId"]);
    await queryInterface.addIndex("documents", [
      "id",
      "atlasId",
      "publishedAt",
    ]);
  },
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("documents", "publishedAt");
    await queryInterface.removeIndex("documents", [
      "id",
      "atlasId",
      "publishedAt",
    ]);
    await queryInterface.addIndex("documents", ["id", "atlasId"]);
  },
};
