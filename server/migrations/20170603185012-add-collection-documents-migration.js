module.exports = {
  up: (queryInterface, Sequelize) => {
    queryInterface.renameTable('atlases', 'collections');
    queryInterface.addColumn('collections', 'documents', {
      type: Sequelize.ARRAY(Sequelize.JSONB),
      allowNull: true,
    });
  },

  down: (queryInterface, _Sequelize) => {
    queryInterface.renameTable('collections', 'atlases');
    queryInterface.removeColumn('atlases', 'documents');
  },
};
