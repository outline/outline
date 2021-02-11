module.exports = {
  up: async (queryInterface, Sequelize) => {
    // dropping because 100% unused and large according to stats
    await queryInterface.removeIndex("documents", ["collaboratorIds"]);

    // dropping because redundant, primary id index exists
    await queryInterface.removeIndex("documents", ["id", "deletedAt"]);

    // dropping because redundant, unique urlId index exists
    await queryInterface.removeIndex("documents", ["urlId", "deletedAt"]);

    // dropping to recreate as partial index
    await queryInterface.removeIndex("documents", [
      "parentDocumentId",
      "atlasId",
      "deletedAt",
    ]);

    // dropping to recreate as partial index
    await queryInterface.removeIndex("documents", ["archivedAt"]);

    // dropping because pointless, all of these have "id" at the beginning so
    // if we"re querying by an id why would you need to index subsequent columns
    await queryInterface.removeIndex("documents", ["id", "atlasId", "publishedAt"]);
    await queryInterface.removeIndex("documents", ["id", "atlasId", "deletedAt"]);
    await queryInterface.removeIndex("documents", ["id", "teamId", "deletedAt"]);

    // create new document indexes
    await queryInterface.addIndex("documents", ["archivedAt"], {
      concurrently: true,
      where: {
        archivedAt: {
          [Sequelize.Op.ne]: null,
        }
      }
    });
    await queryInterface.addIndex("documents", ["deletedAt"], {
      concurrently: true,
      where: {
        deletedAt: {
          [Sequelize.Op.ne]: null,
        }
      }
    });
    await queryInterface.addIndex("documents", ["publishedAt"], {
      concurrently: true,
      where: {
        publishedAt: {
          [Sequelize.Op.ne]: null,
        }
      }
    });
    await queryInterface.addIndex("documents", ["teamId"], {
      concurrently: true
    });
    await queryInterface.addIndex("documents", ["collectionId"], {
      concurrently: true
    });
    await queryInterface.addIndex("documents", ["parentDocumentId"], {
      concurrently: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // remove newer indexes
    await queryInterface.removeIndex("documents", ["archivedAt"]);
    await queryInterface.removeIndex("documents", ["deletedAt"]);
    await queryInterface.removeIndex("documents", ["publishedAt"]);
    await queryInterface.removeIndex("documents", ["teamId"]);
    await queryInterface.removeIndex("documents", ["collectionId"]);
    await queryInterface.removeIndex("documents", ["parentDocumentId"]);

    // restore old indexes with old names
    await queryInterface.addIndex("documents", ["collaboratorIds"], {
      concurrently: true
    });
    await queryInterface.addIndex("documents", ["id", "deletedAt"], {
      concurrently: true
    });
    await queryInterface.addIndex("documents", ["urlId", "deletedAt"], {
      concurrently: true
    });
    await queryInterface.addIndex("documents", ["id", "collectionId", "publishedAt"], {
      name: "documents_id_atlas_id_published_at",
      concurrently: true
    });
    await queryInterface.addIndex("documents", ["id", "collectionId", "deletedAt"], {
      name: "documents_id_atlas_id_deleted_at",
      concurrently: true
    });
    await queryInterface.addIndex("documents", ["id", "teamId", "deletedAt"], {
      concurrently: true
    });
    await queryInterface.addIndex("documents", ["id", "teamId", "deletedAt"], {
      concurrently: true
    });
    await queryInterface.addIndex("documents", ["archivedAt"], {
      concurrently: true
    });
  },
};
