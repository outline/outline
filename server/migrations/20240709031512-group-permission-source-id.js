"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("group_permissions", "sourceId", {
      type: Sequelize.UUID,
      onDelete: "cascade",
      references: {
        model: "group_permissions",
      },
      allowNull: true,
    });

    await queryInterface.removeConstraint("group_permissions", "group_permissions_documentId_fkey")
    await queryInterface.changeColumn("group_permissions", "documentId", {
      type: Sequelize.UUID,
      onDelete: "cascade",
      references: {
        model: "documents",
      },
    });
  },
  async down(queryInterface) {
    await queryInterface.removeConstraint("group_permissions", "group_permissions_documentId_fkey")
    await queryInterface.changeColumn("group_permissions", "documentId", {
      type: Sequelize.UUID,
      references: {
        model: "documents",
      },
    });
    await queryInterface.removeColumn("group_permissions", "sourceId");
  },
};
