module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("notifications", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      actorId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
        },
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
        },
      },
      event: {
        type: Sequelize.STRING,
      },
      email: {
        type: Sequelize.BOOLEAN,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
    await queryInterface.createTable("notification_settings", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
        },
      },
      teamId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "teams",
        },
      },
      event: {
        type: Sequelize.STRING,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
    await queryInterface.addIndex("notification_settings", [
      "teamId",
      "userId",
    ]);
    await queryInterface.addIndex("notification_settings", ["event"]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("notifications");
    await queryInterface.dropTable("notification_settings");
    await queryInterface.removeIndex("notification_settings", [
      "teamId",
      "userId",
    ]);
    await queryInterface.removeIndex("notification_settings", ["event"]);
  },
};
