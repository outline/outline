'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("teams", "rootShareId", {
      type: Sequelize.UUID,
      allowNull: true,
      onDelete: "set null",
      references: {
        model: "shares",
      },
    });
  },

  async down (queryInterface) {
    await queryInterface.removeColumn("teams", "rootShareId");
  }
};
