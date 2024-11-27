"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn("teams", "approximateTotalAttachmentsSize", {
        type: Sequelize.BIGINT,
        defaultValue: 0,
      }, { transaction });
      await queryInterface.addIndex("teams", ["createdAt"], { transaction });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.removeIndex("teams", ["createdAt"], { transaction });
      await queryInterface.removeColumn("teams", "approximateTotalAttachmentsSize", { transaction });
    });
  },
};
