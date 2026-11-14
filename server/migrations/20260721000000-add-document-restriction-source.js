"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("documents", "restrictionSourceId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "documents",
      },
      onDelete: "SET NULL",
    });

    await queryInterface.addIndex("documents", ["restrictionSourceId"], {
      concurrently: true,
      where: {
        restrictionSourceId: {
          [Sequelize.Op.ne]: null,
        },
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("documents", ["restrictionSourceId"]);
    await queryInterface.removeColumn("documents", "restrictionSourceId");
  },
};
