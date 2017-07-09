module.exports = {
  up: (queryInterface, Sequelize) => {
    queryInterface.renameTable('atlases', 'collections').then(() => {
      queryInterface.addColumn('collections', 'documentStructure', {
        type: Sequelize.JSONB,
        allowNull: true,
      });
    });
  },

  down: (queryInterface, _Sequelize) => {
    queryInterface.renameTable('collections', 'atlases').then(() => {
      queryInterface.removeColumn('atlases', 'documentStructure');
    });
  },
};
