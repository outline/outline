"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.changeColumn(
        "file_operations",
        "key",
        {
          type: Sequelize.STRING(4096),
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.changeColumn(
        "file_operations",
        "url",
        {
          type: Sequelize.STRING(4096),
          allowNull: true,
        },
        { transaction }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.changeColumn(
        "file_operations",
        "url",
        {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.changeColumn(
        "file_operations",
        "key",
        {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        { transaction }
      );
    });
  },
};
