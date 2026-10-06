"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex("views", ["userId", "updatedAt"], {
      name: "views_user_id_updated_at",
      concurrently: true,
    });
    await queryInterface.removeIndex("views", "views_user_id");
  },

  async down(queryInterface) {
    await queryInterface.addIndex("views", ["userId"], {
      name: "views_user_id",
      concurrently: true,
    });
    await queryInterface.removeIndex("views", "views_user_id_updated_at");
  },
};
