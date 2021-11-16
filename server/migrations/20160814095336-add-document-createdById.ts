module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("documents", "createdById", {
      type: "UUID",
      allowNull: true,
      references: {
        model: "users",
      },
    });
  },
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("documents", "createdById");
  },
};
