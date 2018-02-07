module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('documents', 'atlasId', 'collectionId');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('documents', 'collectionId', 'atlasId');
  },
};
