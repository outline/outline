"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("users", "notificationSettings", {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
        transaction,
      });

      if (process.env.DEPLOYMENT === "hosted") {
        return;
      }

      // In cloud hosted Outline this migration is done in a script instead due
      // to scale considerations.
      const users = await queryInterface.sequelize.query(
        "SELECT id FROM users",
        {
          type: queryInterface.sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      for (const user of users) {
        const settings = await queryInterface.sequelize.query(
          `SELECT * FROM notification_settings WHERE "userId" = :userId`,
          {
            type: queryInterface.sequelize.QueryTypes.SELECT,
            replacements: { userId: user.id },
            transaction
          }
        );

        const eventTypes = settings.map((setting) => setting.event);
      

        if (eventTypes.length > 0) {
          const notificationSettings = {};

          for (const eventType of eventTypes) {
            notificationSettings[eventType] = true;
          }

          await queryInterface.sequelize.query(
            `UPDATE users SET "notificationSettings" = :notificationSettings WHERE id = :userId`,
            {
              type: queryInterface.sequelize.QueryTypes.UPDATE,
              replacements: {
                userId: user.id,
                notificationSettings: JSON.stringify(notificationSettings),
              },
              transaction
            }
          );
        }
      }
    });
  },

  async down (queryInterface) {
    return queryInterface.removeColumn("users", "notificationSettings");
  }
};
