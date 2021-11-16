module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("teams", "googleId", {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });
    await queryInterface.addColumn("teams", "avatarUrl", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("users", "service", {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "slack",
    });
    await queryInterface.renameColumn("users", "slackId", "serviceId");
    await queryInterface.addIndex("teams", ["googleId"]);
  },
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("teams", "googleId");
    await queryInterface.removeColumn("teams", "avatarUrl");
    await queryInterface.removeColumn("users", "service");
    await queryInterface.renameColumn("users", "serviceId", "slackId");
    await queryInterface.removeIndex("teams", ["googleId"]);
  },
};
