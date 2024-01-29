'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint("comments", "comments_createdById_fkey")
    await queryInterface.changeColumn("comments", "createdById", {
      type: Sequelize.UUID,
      onDelete: "cascade",
      references: {
        model: "users",
      },
    });

    await queryInterface.removeConstraint("comments", "comments_resolvedById_fkey")
    await queryInterface.changeColumn("comments", "resolvedById", {
      type: Sequelize.UUID,
      onDelete: "set null",
      references: {
        model: "users",
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint("comments", "comments_resolvedById_fkey")
    await queryInterface.changeColumn("comments", "resolvedById", {
      type: Sequelize.UUID,
      references: {
        model: "users",
      },
    });

    await queryInterface.removeConstraint("comments", "comments_createdById_fkey")
    await queryInterface.changeColumn("comments", "createdById", {
      type: Sequelize.UUID,
      references: {
        model: "users",
      },
    });
  }
};
