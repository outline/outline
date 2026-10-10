"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex("events", ["collectionId"], {
      concurrently: true,
    });
    await queryInterface.addIndex("shares", ["collectionId"], {
      concurrently: true,
    });
    await queryInterface.addIndex("shares", ["documentId"], {
      concurrently: true,
    });
    await queryInterface.addIndex("notifications", ["userId"], {
      concurrently: true,
    });
    await queryInterface.addIndex("subscriptions", ["documentId"], {
      concurrently: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("subscriptions", ["documentId"]);
    await queryInterface.removeIndex("notifications", ["userId"]);
    await queryInterface.removeIndex("shares", ["documentId"]);
    await queryInterface.removeIndex("shares", ["collectionId"]);
    await queryInterface.removeIndex("events", ["collectionId"]);
  },
};
