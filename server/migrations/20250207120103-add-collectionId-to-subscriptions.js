"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn(
        "subscriptions",
        "collectionId",
        {
          type: Sequelize.UUID,
          allowNull: true,
          onDelete: "cascade",
          references: {
            model: "collections",
          },
        },
        { transaction }
      );
      await queryInterface.addIndex(
        "subscriptions",
        ["userId", "collectionId", "event"],
        {
          name: "subscriptions_user_id_collection_id_event",
          type: "UNIQUE",
          transaction,
        }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.removeIndex(
        "subscriptions",
        ["userId", "collectionId", "event"],
        { transaction }
      );
      await queryInterface.removeColumn("subscriptions", "collectionId", {
        transaction,
      });
    });
  },
};
