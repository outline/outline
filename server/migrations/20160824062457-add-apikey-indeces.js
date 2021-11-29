module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex("apiKeys", ["secret", "deletedAt"]);
    await queryInterface.addIndex("apiKeys", ["userId", "deletedAt"]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex("apiKeys", ["secret", "deletedAt"]);
    await queryInterface.removeIndex("apiKeys", ["userId", "deletedAt"]);
  },
};
