'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("file_operations", "format", {
      type: Sequelize.STRING,
      defaultValue: "outline-markdown",
      allowNull: false
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("file_operations", "format");
  },
};
