module.exports = {
  up: (queryInterface, Sequelize) => {
    queryInterface.changeColumn('users', 'slackId', {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
    });
  },

  down: (queryInterface, Sequelize) => {
    queryInterface.removeConstraint('users', 'users_slack_id_idx');
  },
};
