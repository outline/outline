module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("documents", "html");
    await queryInterface.removeColumn("documents", "preview");
    await queryInterface.removeColumn("revisions", "html");
    await queryInterface.removeColumn("revisions", "preview");
  },
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("documents", "html", {
      type: Sequelize.TEXT,
    });
    await queryInterface.addColumn("documents", "preview", {
      type: Sequelize.TEXT,
    });
    await queryInterface.addColumn("revisions", "html", {
      type: Sequelize.TEXT,
    });
    await queryInterface.addColumn("revisions", "preview", {
      type: Sequelize.TEXT,
    });
  },
};
