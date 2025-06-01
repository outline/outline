'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Create the new relationships table
    await queryInterface.createTable("relationships", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
        },
      },
      documentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "documents",
        },
      },
      reverseDocumentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "documents",
        },
      },
      type: {
        type: Sequelize.ENUM('backlink'),
        allowNull: false,
        defaultValue: 'backlink',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex("relationships", ["documentId"]);
    await queryInterface.addIndex("relationships", ["reverseDocumentId"]);
    await queryInterface.addIndex("relationships", ["type"]);
    await queryInterface.addIndex("relationships", ["documentId", "type"]);

    // Migrate existing backlinks data to relationships table
    await queryInterface.sequelize.query(`
      INSERT INTO relationships (id, "userId", "documentId", "reverseDocumentId", type, "createdAt", "updatedAt")
      SELECT id, "userId", "documentId", "reverseDocumentId", 'backlink', "createdAt", "updatedAt"
      FROM backlinks;
    `);

    // Create a view for backward compatibility
    await queryInterface.sequelize.query(`
      CREATE VIEW backlinks AS
      SELECT id, "userId", "documentId", "reverseDocumentId", "createdAt", "updatedAt"
      FROM relationships
      WHERE type = 'backlink';
    `);
  },

  async down (queryInterface, Sequelize) {
    // Drop the view
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS backlinks;');
    
    // Recreate the original backlinks table
    await queryInterface.createTable("backlinks", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
        },
      },
      documentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "documents",
        },
      },
      reverseDocumentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "documents",
        },
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Migrate data back from relationships to backlinks
    await queryInterface.sequelize.query(`
      INSERT INTO backlinks (id, "userId", "documentId", "reverseDocumentId", "createdAt", "updatedAt")
      SELECT id, "userId", "documentId", "reverseDocumentId", "createdAt", "updatedAt"
      FROM relationships
      WHERE type = 'backlink';
    `);

    // Add original indexes
    await queryInterface.addIndex("backlinks", ["documentId"]);
    await queryInterface.addIndex("backlinks", ["reverseDocumentId"]);

    // Drop the relationships table
    await queryInterface.dropTable("relationships");
    
    // Drop the enum type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_relationships_type";');
  }
};

