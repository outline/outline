"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex("documents", "documents_id_atlas_id_deleted_at");
    await queryInterface.removeIndex("apiKeys", "api_keys_secret_deleted_at");
    await queryInterface.removeIndex("groups", "groups_deleted_at");
  },

  down: async (queryInterface, Sequelize) => {
    // noop
  }
};