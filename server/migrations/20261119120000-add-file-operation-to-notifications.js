"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("notifications", "fileOperationId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "file_operations",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    await queryInterface.addIndex("notifications", ["fileOperationId"], {
      concurrently: true,
      where: { fileOperationId: { [Sequelize.Op.ne]: null } },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("notifications", ["fileOperationId"]);
    await queryInterface.removeColumn("notifications", "fileOperationId");
  },
};
