"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addIndex("notifications", ["createdAt"], {
        transaction,
      });
      await queryInterface.addIndex("notifications", ["event"], {
        transaction,
      });
      await queryInterface.addIndex("notifications", ["viewedAt"], {
        where: {
          viewedAt: {
            [Sequelize.Op.is]: null,
          },
        },
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex("notifications", ["createdAt"], {
        transaction,
      });
      await queryInterface.removeIndex("notifications", ["event"], {
        transaction,
      });
      await queryInterface.removeIndex("notifications", ["viewedAt"], {
        transaction,
      });
    });
  },
};
