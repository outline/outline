"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn("groups", "externalId", {
        type: Sequelize.STRING,
      }, { transaction });
      await queryInterface.addIndex("groups", ["externalId"], { transaction });
      await queryInterface.addIndex("group_permissions", ["documentId"], { transaction });
      await queryInterface.addIndex("group_permissions", ["sourceId"], { transaction });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.removeIndex("group_permissions", ["sourceId"], { transaction });
      await queryInterface.removeIndex("group_permissions", ["documentId"], { transaction });
      await queryInterface.removeIndex("groups", ["externalId"], { transaction });
      await queryInterface.removeColumn("groups", "externalId", { transaction });
    });
  },
};
