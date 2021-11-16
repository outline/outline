module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn("documents", "atlasId", "collectionId");
    await queryInterface.removeColumn("documents", "private");
    await queryInterface.addColumn("events", "documentId", {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
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
