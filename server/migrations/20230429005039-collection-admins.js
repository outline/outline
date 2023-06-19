'use strict';

module.exports = {
  async up(queryInterface) {
    if (process.env.DEPLOYMENT === "hosted") {
      return;
    }

    await queryInterface.sequelize.transaction(async (transaction) => {
      // Convert collection members to admins where the user is the only 
      // membership in the collection.
      await queryInterface.sequelize.query(
        `UPDATE collection_users cu
        SET permission = 'admin'
        WHERE (
          SELECT COUNT(*) 
          FROM collection_users 
          WHERE "collectionId" = cu."collectionId"
          AND permission = 'read_write'
        ) = 1;`,
        {
          type: queryInterface.sequelize.QueryTypes.SELECT,
        }
      );

      // Convert collection members to admins where the collection is private
      // and they currently have read_write permission
      await queryInterface.sequelize.query(
        `UPDATE collection_users
        SET permission = 'admin'
        WHERE permission = 'read_write' 
        AND "collectionId" IN (
          SELECT c."id" 
          FROM collections c
          WHERE c.permission IS NULL
        );`,
        {
          type: queryInterface.sequelize.QueryTypes.SELECT,
        }
      );
    });
  },

  async down(queryInterface) {
    if (process.env.DEPLOYMENT === "hosted") {
      return;
    }

    await queryInterface.sequelize.query(
      "UPDATE collection_users SET permission = 'read_write' WHERE permission = 'admin'",
      {
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );
  }
};
