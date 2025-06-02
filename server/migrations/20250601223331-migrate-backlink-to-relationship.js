'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Rename the existing backlinks table to relationships
      await queryInterface.renameTable("backlinks", "relationships", { transaction });

      // Add the type column with default value
      await queryInterface.addColumn("relationships", "type", {
        type: Sequelize.ENUM('backlink'),
        allowNull: false,
        defaultValue: 'backlink',
      }, { transaction });

      // Add new indexes for performance (the old indexes on documentId and reverseDocumentId should still exist)
      await queryInterface.addIndex("relationships", ["type"], { transaction });
      await queryInterface.addIndex("relationships", ["documentId", "type"], { transaction });

      // Create a view for backward compatibility
      await queryInterface.sequelize.query(`
        CREATE VIEW backlinks AS
        SELECT id, "userId", "documentId", "reverseDocumentId", "createdAt", "updatedAt"
        FROM relationships
        WHERE type = 'backlink';
      `, { transaction });
    });
  },

  async down (queryInterface, Sequelize) {
    // Drop the view
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS backlinks;');
    
    // Remove the type-specific indexes
    await queryInterface.removeIndex("relationships", ["type"]);
    await queryInterface.removeIndex("relationships", ["documentId", "type"]);
    
    // Remove the type column
    await queryInterface.removeColumn("relationships", "type");
    
    // Drop the enum type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_relationships_type";');
    
    // Rename the table back to backlinks
    await queryInterface.renameTable("relationships", "backlinks");
  }
};
