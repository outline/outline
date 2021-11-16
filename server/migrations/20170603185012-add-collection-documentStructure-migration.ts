module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable("atlases", "collections");
    await queryInterface.addColumn("collections", "documentStructure", {
      type: Sequelize.JSONB,
      allowNull: true,
    });
  },
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  down: async (queryInterface, _Sequelize) => {
    await queryInterface.renameTable("collections", "atlases");
    await queryInterface.removeColumn("atlases", "documentStructure");
  },
};
