module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex("apiKeys", ["secret", "deletedAt"]);
    await queryInterface.addIndex("apiKeys", ["userId", "deletedAt"]);
  },
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex("apiKeys", ["secret", "deletedAt"]);
    await queryInterface.removeIndex("apiKeys", ["userId", "deletedAt"]);
  },
};
