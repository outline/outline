"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("attachments", "key", {
      type: Sequelize.STRING(4096),
      allowNull: false,
    });
    await queryInterface.changeColumn("attachments", "url", {
      type: Sequelize.STRING(4096),
      allowNull: false,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("attachments", "key", {
      type: Sequelize.STRING(255),
      allowNull: false,
    });
    await queryInterface.changeColumn("attachments", "url", {
      type: Sequelize.STRING(255),
      allowNull: false,
    });
  },
};
