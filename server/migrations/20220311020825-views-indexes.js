'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex("views", ["userId"], {
      name: "views_user_id",
    });
    await queryInterface.addIndex("views", ["updatedAt"], {
      name: "views_updated_at",
    });
    await queryInterface.addIndex("collection_users", ["userId"], {
      name: "collection_users_user_id",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex("views", "views_updated_at");
    await queryInterface.removeIndex("views", "views_user_id");
    await queryInterface.removeIndex("collection_users", "collection_users_user_id");
  }
};
