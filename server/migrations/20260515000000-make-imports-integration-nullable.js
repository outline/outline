"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE "imports" ALTER COLUMN "integrationId" DROP NOT NULL`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE "imports" ALTER COLUMN "integrationId" SET NOT NULL`
    );
  },
};
