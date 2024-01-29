module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("authentications", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
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
      token: {
        type: Sequelize.BLOB,
        allowNull: true,
      },
      scopes: {
        type: Sequelize.ARRAY(Sequelize.STRING),
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
    await queryInterface.dropTable("authentications");
  },
};
