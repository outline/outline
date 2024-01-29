module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("shares", "revokedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("shares", "revokedById", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "users",
      },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("shares", "revokedAt");
    await queryInterface.removeColumn("shares", "revokedById");
  },
};
