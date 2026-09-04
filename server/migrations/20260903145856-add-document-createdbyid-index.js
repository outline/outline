"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex("documents", ["createdById"], {
      concurrently: true,
    });
    await queryInterface.addIndex("documents", ["lastModifiedById"], {
      concurrently: true,
    });
    await queryInterface.addIndex("revisions", ["userId"], {
      concurrently: true,
    });
    await queryInterface.addIndex("events", ["userId"], {
      concurrently: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("events", ["userId"]);
    await queryInterface.removeIndex("revisions", ["userId"]);
    await queryInterface.removeIndex("documents", ["lastModifiedById"]);
    await queryInterface.removeIndex("documents", ["createdById"]);
  },
};
