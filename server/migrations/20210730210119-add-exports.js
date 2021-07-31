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
        type: Sequelize.ENUM("creating", "uploading", "complete", "error"),
        allowNull: false,
      },
      collectionId: {
        type: Sequelize.UUID
      },
      key: {
        type: Sequelize.STRING,
        allowNull: false,
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
