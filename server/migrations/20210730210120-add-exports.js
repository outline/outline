'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("exports",{
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      state: {
        type: Sequelize.ENUM("creating", "uploading", "complete", "error","expired"),
        allowNull: false,
      },
      
      key: {
        type: Sequelize.STRING,
      },
      url: {
        type: Sequelize.STRING,
      },
      size: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      userId: {
        type: Sequelize.UUID,       
        allowNull: false,
        references: {
          model: "users"
        }
      },
      collectionId: {
        type: Sequelize.UUID,       
        references: {
          model: "collections"
        }
      },
      teamId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "teams"
        }
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('exports');
  }
};
