"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("authorized_emails", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      teamId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: new Date(),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: new Date(),
      },
    });

    await queryInterface.addIndex("authorized_emails", ["teamId", "email"], {
      unique: true,
      name: "team_email_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("authorized_emails");
  },
};
