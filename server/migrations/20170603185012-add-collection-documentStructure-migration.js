module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable("atlases", "collections");
    await queryInterface.addColumn("collections", "documentStructure", {
      type: Sequelize.JSONB,
      allowNull: true,
    });
  },
  down: async (queryInterface, _Sequelize) => {
    await queryInterface.renameTable("collections", "atlases");
    await queryInterface.removeColumn("atlases", "documentStructure");
  },
};
