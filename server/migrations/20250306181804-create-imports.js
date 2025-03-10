"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("imports", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      service: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      state: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      input: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      createdById: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
        },
      },
      integrationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "integrations",
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("imports");
  },
};
