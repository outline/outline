'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Update user memberships where the user is the collection creator
    // and currently has 'admin' permission, changing it to 'owner'
    await queryInterface.sequelize.query(`
      UPDATE user_permissions
      SET permission = 'owner'
      FROM collections
      WHERE user_permissions."collectionId" = collections.id
        AND user_permissions."userId" = collections."createdById"
        AND user_permissions.permission = 'admin'
        AND user_permissions."documentId" IS NULL;
    `);
  },

  async down (queryInterface, Sequelize) {
    // Revert owner permissions back to admin for collection creators
    await queryInterface.sequelize.query(`
      UPDATE user_permissions
      SET permission = 'admin'
      WHERE permission = 'owner'
        AND "documentId" IS NULL;
    `);
  }
};
