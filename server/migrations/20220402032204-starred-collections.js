'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Previously there was no onDelete cascade so there may be existing stars
    // in the db that reference documents that no longer exist. We must clean
    // these up first before applying the new constraint.
    await queryInterface.sequelize.query(`
      DELETE FROM stars
      WHERE NOT EXISTS (
          SELECT NULL
          FROM documents doc
          WHERE doc.id = "documentId"
      )
    `);

    await queryInterface.addColumn("stars", "collectionId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "collections",
      },
    });
    await queryInterface.changeColumn("stars", "documentId", {
      type: Sequelize.UUID,
      allowNull: true
    });
    await queryInterface.changeColumn("stars", "documentId", {
      type: Sequelize.UUID,
      onDelete: "cascade",
      references: {
        model: "documents",
      },
    });
    await queryInterface.changeColumn("stars", "userId", {
      type: Sequelize.UUID,
      allowNull: false,
      onDelete: "cascade",
      references: {
        model: "users",
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("stars", "collectionId");
    await queryInterface.changeColumn("stars", "documentId", {
      type: Sequelize.UUID,
      allowNull: false
    });
    await queryInterface.removeConstraint("stars", "stars_documentId_fkey")
    await queryInterface.removeConstraint("stars", "stars_userId_fkey")
  }
};
