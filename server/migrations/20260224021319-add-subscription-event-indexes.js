"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex("subscriptions", ["event", "documentId"], {
      name: "subscriptions_event_document_id",
      where: { deletedAt: null },
      concurrently: true,
    });
    await queryInterface.addIndex("subscriptions", ["event", "collectionId"], {
      name: "subscriptions_event_collection_id",
      where: { deletedAt: null },
      concurrently: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      "subscriptions",
      "subscriptions_event_document_id",
      { concurrently: true }
    );
    await queryInterface.removeIndex(
      "subscriptions",
      "subscriptions_event_collection_id",
      { concurrently: true }
    );
  },
};
