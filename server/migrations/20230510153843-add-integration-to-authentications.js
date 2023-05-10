"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "authentications",
        "integrationId",
        {
          type: Sequelize.UUID,
          allowNull: true,
          onDelete: "cascade",
          unique: true,
          references: {
            model: "integrations",
          },
        },
        { transaction }
      );

      const integrations = await queryInterface.sequelize.query(
        `SELECT id, "authenticationId" FROM integrations where "authenticationId" is not null`,
        {
          type: queryInterface.sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      for (const integration of integrations) {
        await queryInterface.sequelize.query(
          `UPDATE authentications SET "integrationId" = :integrationId WHERE id = :authenticationId and "integrationId" is null`,
          {
            type: queryInterface.sequelize.QueryTypes.UPDATE,
            replacements: {
              integrationId: integration.id,
              authenticationId: integration.authenticationId,
            },
            transaction,
          }
        );
      }

      await queryInterface.sequelize.query(
        `DELETE from authentications WHERE "integrationId" is null`,
        {
          type: queryInterface.sequelize.QueryTypes.DELETE,
          transaction,
        }
      );

      await queryInterface.changeColumn(
        "authentications",
        "integrationId",
        {
          type: Sequelize.UUID,
          allowNull: false,
        },
        { transaction }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("authentications", "integrationId");
  },
};
