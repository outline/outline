"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("documents", "index", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addIndex("documents", ["collectionId", "index"], {
      name: "documents_draft_index",
      where: {
        publishedAt: null,
        index: { [Sequelize.Op.ne]: null },
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("documents", "documents_draft_index");
    await queryInterface.removeColumn("documents", "index");
  },
};
