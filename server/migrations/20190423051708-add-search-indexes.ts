module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex("documents", ["updatedAt"]);
    await queryInterface.addIndex("documents", ["archivedAt"]);
    await queryInterface.addIndex("documents", ["collaboratorIds"]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex("documents", ["updatedAt"]);
    await queryInterface.removeIndex("documents", ["archivedAt"]);
    await queryInterface.removeIndex("documents", ["collaboratorIds"]);
  },
};
