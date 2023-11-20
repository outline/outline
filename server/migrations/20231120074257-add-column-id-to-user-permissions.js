"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
        { transaction }
      );
      await queryInterface.addColumn(
        "user_permissions",
        "id",
        {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal("uuid_generate_v4()"),
        },
        { transaction }
      );
      await queryInterface.changeColumn(
        "user_permissions",
        "id",
        {
          type: Sequelize.UUID,
          allowNull: false,
        },
        { transaction }
      );
      await queryInterface.addConstraint("user_permissions", {
        type: "PRIMARY KEY",
        fields: ["id"],
        transaction,
      });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn("user_permissions", "id", {
        transaction,
      });
      await queryInterface.sequelize.query(
        `DROP EXTENSION IF EXISTS "uuid-ossp";`,
        { transaction }
      );
    });
  },
};
