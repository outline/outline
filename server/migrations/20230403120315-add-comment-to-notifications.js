'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("notifications", "commentId", {
      type: Sequelize.UUID,
      allowNull: true,
      onDelete: "cascade",
      references: {
        model: "comments",
      },
    });

    await queryInterface.addColumn("notifications", "revisionId", {
      type: Sequelize.UUID,
      allowNull: true,
      onDelete: "cascade",
      references: {
        model: "revisions",
      },
    });

    await queryInterface.addColumn("notifications", "collectionId", {
      type: Sequelize.UUID,
      allowNull: true,
      onDelete: "cascade",
      references: {
        model: "collections",
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("notifications", "collectionId")
    await queryInterface.removeColumn("notifications", "revisionId")
    await queryInterface.removeColumn("notifications", "commentId")
  }
};
