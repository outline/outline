module.exports = {
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
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("teams", "googleId");
    await queryInterface.removeColumn("teams", "avatarUrl");
    await queryInterface.removeColumn("users", "service");
    await queryInterface.renameColumn("users", "serviceId", "slackId");
    await queryInterface.removeIndex("teams", ["googleId"]);
  },
};
