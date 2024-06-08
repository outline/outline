'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeConstraint(
        "user_permissions",
        "user_permissions_createdById_fkey",
        { transaction }
      );
      await queryInterface.addConstraint("user_permissions", {
        fields: ["createdById"],
        name: "user_permissions_createdById_fkey",
        type: "foreign key",
        onDelete: "cascade",
        references: {
          table: "users",
          field: "id",
        },
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeConstraint(
        "user_permissions",
        "user_permissions_createdById_fkey",
        { transaction }
      );
      await queryInterface.addConstraint("user_permissions", {
        fields: ["createdById"],
        name: "user_permissions_createdById_fkey",
        type: "foreign key",
        onDelete: "set null",
        references: {
          table: "users",
          field: "id",
        },
        transaction,
      });
    });
  }
};
