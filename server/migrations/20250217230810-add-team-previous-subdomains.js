"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn("teams", "previousSubdomains", {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
      }, { transaction });
      await queryInterface.sequelize.query(
        `CREATE INDEX teams_previous_subdomains ON teams USING GIN ("previousSubdomains");`,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.sequelize.query(
        `DROP INDEX teams_previous_subdomains;`,
        { transaction }
      );
      await queryInterface.removeColumn("teams", "previousSubdomains", { transaction });
    });
  },
};
