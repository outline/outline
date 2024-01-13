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
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("user_permissions", "sourceId");
  },
};
