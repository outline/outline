module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("integrations", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      type: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
        },
      },
      teamId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "teams",
        },
      },
      serviceId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      collectionId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "collections",
        },
      },
      authenticationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "authentications",
        },
      },
      events: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
      },
      settings: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("integrations");
  },
};
