'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex("views", ["userId"], {
      name: "views_user_id",
    });
    await queryInterface.addIndex("views", ["updatedAt"], {
      name: "views_updated_at",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex("views", "views_updated_at");
    await queryInterface.removeIndex("views", "views_user_id");
  }
};
