module.exports = {
  up: (queryInterface, Sequelize) => {
    queryInterface.renameTable('atlases', 'collections');
    queryInterface.addColumn('collections', 'documentStructure', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
  },

  down: (queryInterface, _Sequelize) => {
    queryInterface.renameTable('collections', 'atlases');
    queryInterface.removeColumn('atlases', 'documentStructure');
  },
};
