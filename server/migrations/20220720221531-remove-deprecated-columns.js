'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // This guard prevents the migration from running and destroying this
      // service data if the script from v0.54.0 has not yet been run.
      if (process.env.DEPLOYMENT !== "hosted") {
        const [teams] = await queryInterface.sequelize.query(
          `SELECT COUNT(*) FROM teams`,
          { transaction }
        );
        const [authenticationProviders] = await queryInterface.sequelize.query(
          `SELECT COUNT(*) FROM authentication_providers`,
          { transaction }
        );

        if (teams[0].count > 0 && authenticationProviders[0].count === 0) {
          throw Error("Refusing to destroy deprecated columns without authentication providers");
        }
      }

      await queryInterface.removeColumn("attachments", "url", { transaction });
      await queryInterface.removeColumn("users", "service", { transaction });
      await queryInterface.removeColumn("users", "serviceId", { transaction });
      await queryInterface.removeColumn("teams", "slackId", { transaction });
      await queryInterface.removeColumn("teams", "googleId", { transaction });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("attachments", "url", {
        type: Sequelize.STRING(4096),
        allowNull: false,
        defaultValue: "",
        transaction
      });
      await queryInterface.addColumn("users", "service", {
        type: Sequelize.STRING,
        allowNull: true,
        transaction
      });
      await queryInterface.addColumn("users", "serviceId", {
        type: Sequelize.STRING,
        allowNull: true,
        transaction
      });
      await queryInterface.addColumn("teams", "slackId", {
        type: Sequelize.STRING,
        allowNull: true,
        transaction
      });
      await queryInterface.addColumn("teams", "googleId", {
        type: Sequelize.STRING,
        allowNull: true,
        transaction
      });
    });
  }
};
