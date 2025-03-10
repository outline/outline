"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("import_tasks", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      state: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      input: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      output: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      importId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "imports",
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
    await queryInterface.dropTable("import_tasks");
  },
};
