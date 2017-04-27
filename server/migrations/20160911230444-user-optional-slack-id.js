/* eslint-disable */
'use strict';

module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.changeColumn('users', 'slackId', {
      type: Sequelize.STRING,
      unique: false,
      allowNull: true,
    });
    queryInterface.changeColumn('teams', 'slackId', {
      type: Sequelize.STRING,
      unique: false,
      allowNull: true,
    });
  },

  down: function(queryInterface, Sequelize) {
    queryInterface.changeColumn('users', 'slackId', {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
    });
    queryInterface.changeColumn('teams', 'slackId', {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
    });
  },
};
