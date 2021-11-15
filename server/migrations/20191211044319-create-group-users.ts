"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("group_users", {
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
        },
      },
      groupId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "groups",
        },
      },
      createdById: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
        },
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });
    await queryInterface.addIndex("group_users", ["groupId", "userId"]);
    await queryInterface.addIndex("group_users", ["userId"]);
    await queryInterface.addIndex("group_users", ["deletedAt"]);
  },
  down: async (queryInterface, Sequelize) => {
    return queryInterface.dropTable("group_users");
  },
};
