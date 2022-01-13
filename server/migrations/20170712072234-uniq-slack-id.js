module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("users", "slackId", {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint("users", "users_slack_id_idx");
  },
};
