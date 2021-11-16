module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn(
      "authentications",
      "serviceId",
      "service"
    );
    await queryInterface.renameColumn("integrations", "serviceId", "service");
  },
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn(
      "authentications",
      "service",
      "serviceId"
    );
    await queryInterface.renameColumn("integrations", "service", "serviceId");
  },
};
