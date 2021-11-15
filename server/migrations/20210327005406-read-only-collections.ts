"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("collections", "permission", {
      type: Sequelize.STRING,
      defaultValue: null,
      allowNull: true,
      validate: {
        isIn: [["read", "read_write"]],
      },
    });
    await queryInterface.sequelize.query(`
      UPDATE collections
      SET "permission" = 'read_write'
      WHERE "private" = false
    `);
    await queryInterface.removeColumn("collections", "private");
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("collections", "private", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.sequelize.query(`
      UPDATE collections
      SET "private" = true
      WHERE "permission" IS NULL
    `);
    await queryInterface.removeColumn("collections", "permission");
  },
};
