"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addIndex("subscriptions", ["event", "documentId"], {
        name: "subscriptions_event_document_id",
        where: { deletedAt: null },
        transaction,
      });
      await queryInterface.addIndex(
        "subscriptions",
        ["event", "collectionId"],
        {
          name: "subscriptions_event_collection_id",
          where: { deletedAt: null },
          transaction,
        }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex(
        "subscriptions",
        "subscriptions_event_document_id",
        { transaction }
      );
      await queryInterface.removeIndex(
        "subscriptions",
        "subscriptions_event_collection_id",
        { transaction }
      );
    });
  },
};
