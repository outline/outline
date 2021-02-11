module.exports = {
  up: async (queryInterface, Sequelize) => {
    // dropping because redundant, contains id
    await queryInterface.removeIndex("collections", "atlases_id_deleted_at");
    await queryInterface.removeIndex("collections", "atlases_id_team_id_deleted_at");

    // create new collection indexes
    await queryInterface.addIndex("collections", ["teamId"], {
      concurrently: true,
    });
    await queryInterface.addIndex("collections", ["deletedAt"], {
      concurrently: true,
      where: {
        deletedAt: {
          [Sequelize.Op.ne]: null,
        }
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    // remove newer indexes
    await queryInterface.removeIndex("collections", ["teamId"]);
    await queryInterface.removeIndex("collections", ["deletedAt"]);

    // restore old indexes with old names
    await queryInterface.addIndex("collections", ["id", "deletedAt"], {
      name: "atlases_id_deleted_at",
      concurrently: true
    });
    await queryInterface.addIndex("collections", ["id", "teamId", "deletedAt"], {
      name: "atlases_id_team_id_deleted_at",
      concurrently: true
    });
  }
}