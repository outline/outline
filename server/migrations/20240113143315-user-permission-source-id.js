"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("user_permissions", "sourceId", {
      type: Sequelize.UUID,
      onDelete: "cascade",
      references: {
        model: "user_permissions",
      },
      allowNull: true,
    });

    await queryInterface.removeConstraint("user_permissions", "user_permissions_documentId_fkey")
    await queryInterface.changeColumn("user_permissions", "documentId", {
      type: Sequelize.UUID,
      onDelete: "cascade",
      references: {
        model: "documents",
      },
    });
  },
  async down(queryInterface) {
    await queryInterface.removeConstraint("user_permissions", "user_permissions_documentId_fkey")
    await queryInterface.changeColumn("user_permissions", "documentId", {
      type: Sequelize.UUID,
      references: {
        model: "documents",
      },
    });
    await queryInterface.removeColumn("user_permissions", "sourceId");
  },
};
