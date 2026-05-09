"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Remove all existing records as they lack document scope
      await queryInterface.bulkDelete(
        "share_subscriptions",
        {},
        { transaction }
      );

      await queryInterface.addColumn(
        "share_subscriptions",
        "documentId",
        {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "documents",
            key: "id",
          },
          onDelete: "CASCADE",
        },
        { transaction }
      );

      // Replace old unique index with one that includes documentId
      await queryInterface.removeIndex(
        "share_subscriptions",
        ["shareId", "emailFingerprint"],
        { transaction }
      );

      await queryInterface.addIndex(
        "share_subscriptions",
        ["shareId", "documentId", "emailFingerprint"],
        { unique: true, transaction }
      );
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex(
        "share_subscriptions",
        ["shareId", "documentId", "emailFingerprint"],
        { transaction }
      );

      await queryInterface.addIndex(
        "share_subscriptions",
        ["shareId", "emailFingerprint"],
        { unique: true, transaction }
      );

      await queryInterface.removeColumn("share_subscriptions", "documentId", {
        transaction,
      });
    });
  },
};
