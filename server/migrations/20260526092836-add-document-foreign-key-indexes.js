"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex("file_operations", ["documentId"], {
      concurrently: true,
    });
    await queryInterface.addIndex("share_subscriptions", ["documentId"], {
      concurrently: true,
    });
    await queryInterface.addIndex("access_requests", ["documentId"], {
      concurrently: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("access_requests", ["documentId"]);
    await queryInterface.removeIndex("share_subscriptions", ["documentId"]);
    await queryInterface.removeIndex("file_operations", ["documentId"]);
  },
};
