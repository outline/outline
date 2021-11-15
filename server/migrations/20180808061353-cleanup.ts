module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn("documents", "atlasId", "collectionId");
    await queryInterface.removeColumn("documents", "private");
    await queryInterface.addColumn("events", "documentId", {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn("documents", "collectionId", "atlasId");
    await queryInterface.removeColumn("events", "documentId");
    await queryInterface.addColumn("documents", "private", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
  },
};
