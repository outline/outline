module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex("revisions", ["documentId"]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex("revisions", ["documentId"]);
  },
};
