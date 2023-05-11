"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeConstraint(
        "integrations",
        "integrations_authenticationId_fkey",
        { transaction }
      );
      await queryInterface.changeColumn(
        "integrations",
        "authenticationId",
        {
          type: Sequelize.UUID,
          allowNull: true,
          unique: true,
          onDelete: "SET NULL",
          references: {
            model: "authentications",
          },
        },
        { transaction }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeConstraint(
        "integrations",
        "integrations_authenticationId_fkey",
        { transaction }
      );
      await queryInterface.changeColumn(
        "integrations",
        "authenticationId",
        {
          type: Sequelize.UUID,
          allowNull: true,
          onDelete: "CASCADE",
          references: {
            model: "authentications",
          },
        },
        { transaction }
      );
    });
  },
};
