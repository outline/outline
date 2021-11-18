module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("users", "suspendedById", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "users",
      },
    });
    await queryInterface.addColumn("users", "suspendedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("users", "suspendedById");
    await queryInterface.removeColumn("users", "suspendedAt");
  },
};
