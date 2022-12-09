"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.sequelize.transaction(async (transaction) => {
        await queryInterface.addColumn(
          "shares",
          "urlId",
          {
            type: Sequelize.STRING,
            allowNull: true,
            transaction,
          },
        );

        await queryInterface.addConstraint("shares", {
          fields: ["urlId", "teamId"],
          type: "unique",
          transaction,
        });
      });
    } catch(err) {
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.sequelize.transaction(async (transaction) => {
        await queryInterface.removeConstraint(
          "shares",
          "shares_urlId_teamId_uk",
          { transaction }
        );

        await queryInterface.removeColumn("shares", "urlId", { transaction });
      });
    } catch (err) {
      throw err;
    }
  },
};
