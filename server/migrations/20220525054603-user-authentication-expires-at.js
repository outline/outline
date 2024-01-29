'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("user_authentications", "expiresAt", {
        type: Sequelize.DATE,
        allowNull: true,
        transaction
      });
      await queryInterface.addColumn("user_authentications", "lastValidatedAt", {
        type: Sequelize.DATE,
        allowNull: true,
        transaction
      });
    });
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn(
        "user_authentications",
        "lastValidatedAt",
        {
          transaction
        }
      );
      await queryInterface.removeColumn("user_authentications", "expiresAt", {
        transaction
      });
    });
    },
};
