module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("shares", "revokedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("shares", "revokedById", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "users",
      },
    });
  },
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("shares", "revokedAt");
    await queryInterface.removeColumn("shares", "revokedById");
  },
};
