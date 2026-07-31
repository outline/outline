"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("databases", "archivedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("databases", "archivedById", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "users",
      },
    });
    await queryInterface.addIndex("databases", ["collectionId", "archivedAt"]);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("databases", [
      "collectionId",
      "archivedAt",
    ]);
    await queryInterface.removeColumn("databases", "archivedById");
    await queryInterface.removeColumn("databases", "archivedAt");
  },
};
