"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "oauth_authentications",
        "grantId",
        {
          type: Sequelize.UUID,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "oauth_authorization_codes",
        "grantId",
        {
          type: Sequelize.UUID,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addIndex("oauth_authentications", ["grantId"], {
        transaction,
      });

      await queryInterface.addIndex("oauth_authorization_codes", ["grantId"], {
        transaction,
      });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex("oauth_authentications", ["grantId"], {
        transaction,
      });
      await queryInterface.removeIndex(
        "oauth_authorization_codes",
        ["grantId"],
        {
          transaction,
        }
      );
      await queryInterface.removeColumn("oauth_authentications", "grantId", {
        transaction,
      });
      await queryInterface.removeColumn(
        "oauth_authorization_codes",
        "grantId",
        {
          transaction,
        }
      );
    });
  },
};
