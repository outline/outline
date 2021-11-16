module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex("documents", ["updatedAt"]);
    await queryInterface.addIndex("documents", ["archivedAt"]);
    await queryInterface.addIndex("documents", ["collaboratorIds"]);
  },
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex("documents", ["updatedAt"]);
    await queryInterface.removeIndex("documents", ["archivedAt"]);
    await queryInterface.removeIndex("documents", ["collaboratorIds"]);
  },
};
