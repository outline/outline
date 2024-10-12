'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface) {
    await queryInterface.removeColumn('group_users', 'deletedAt');

    // Cleanup any rows with duplicate groupId + userId
    await queryInterface.sequelize.query(`
      DELETE FROM group_users
      WHERE "createdAt" NOT IN (
        SELECT MIN("createdAt")
        FROM group_users
        GROUP BY "groupId", "userId"
      )
    `);

    // Add groupId + userId as primary key
    await queryInterface.addConstraint('group_users', {
      fields: ['groupId', 'userId'],
      type: 'primary key',
      name: 'group_users_pkey'
    });

    await queryInterface.removeIndex("group_users", "group_users_group_id_user_id");
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.addIndex("group_users", ["groupId", "userId"]);
    await queryInterface.removeConstraint('group_users', 'group_users_pkey');
    await queryInterface.addColumn('group_users', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
  }
};
