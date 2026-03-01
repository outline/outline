"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("tags", "documentCount", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    // Backfill existing counts from document_tags
    await queryInterface.sequelize.query(`
      UPDATE tags
      SET "documentCount" = (
        SELECT COUNT(*)
        FROM document_tags
        WHERE document_tags."tagId" = tags.id
      )
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("tags", "documentCount");
  },
};
