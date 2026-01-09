"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("notifications", "accessRequestId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "access_requests",
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    await queryInterface.addIndex("notifications", ["accessRequestId"]);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("notifications", ["accessRequestId"]);
    await queryInterface.removeColumn("notifications", "accessRequestId");
  },
};
