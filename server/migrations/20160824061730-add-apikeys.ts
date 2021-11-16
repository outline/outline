module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("apiKeys", {
      id: {
        type: "UUID",
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: "CHARACTER VARYING",
        allowNull: true,
      },
      secret: {
        type: "CHARACTER VARYING",
        allowNull: false,
        unique: true,
      },
      userId: {
        type: "UUID",
        allowNull: true,
      },
      createdAt: {
        type: "TIMESTAMP WITH TIME ZONE",
        allowNull: false,
      },
      updatedAt: {
        type: "TIMESTAMP WITH TIME ZONE",
        allowNull: false,
      },
      deletedAt: {
        type: "TIMESTAMP WITH TIME ZONE",
        allowNull: true,
      },
    });
  },
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("apiKeys");
  },
};
