"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex("revisions", ["createdAt"], {
      concurrently: true,
    });
    await queryInterface.addIndex("user_permissions", ["sourceId"], {
      concurrently: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("user_permissions", ["sourceId"]);
    await queryInterface.removeIndex("revisions", ["createdAt"]);
  },
};
