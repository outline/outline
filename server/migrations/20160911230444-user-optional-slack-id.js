module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("users", "slackId", {
      type: Sequelize.STRING,
      unique: false,
      allowNull: true,
    });
    await queryInterface.changeColumn("teams", "slackId", {
      type: Sequelize.STRING,
      unique: false,
      allowNull: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("users", "slackId", {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
    });
    await queryInterface.changeColumn("teams", "slackId", {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
    });
  },
};
