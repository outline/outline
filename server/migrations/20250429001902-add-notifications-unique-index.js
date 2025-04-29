"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    if (
      process.env.NODE_ENV !== "test" && process.env.DEPLOYMENT !== "hosted"
    ) {
      // Delete duplicate notifications, keeping only the most recent one for each user-comment pair
      await queryInterface.sequelize.query(`
        WITH duplicates AS (
          SELECT id
          FROM (
            SELECT id,
                  ROW_NUMBER() OVER (PARTITION BY "userId", "commentId", "event" ORDER BY "createdAt" DESC) as row_num
            FROM notifications
            WHERE "commentId" IS NOT NULL
          ) sub
          WHERE sub.row_num > 1
        )
        DELETE FROM notifications
        WHERE id IN (SELECT id FROM duplicates);
      `);
    }

    await queryInterface.addIndex("notifications", ["userId", "commentId", "event"], {
      unique: true,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeIndex("notifications", ["userId", "commentId", "event"]);
  }
};
