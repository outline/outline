module.exports = {
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
