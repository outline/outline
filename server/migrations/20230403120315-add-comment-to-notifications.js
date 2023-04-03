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
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("notifications", "commentId")
  }
};
