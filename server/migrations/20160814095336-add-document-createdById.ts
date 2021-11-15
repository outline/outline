module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("documents", "createdById", {
      type: "UUID",
      allowNull: true,
      references: {
        model: "users",
      },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("documents", "createdById");
  },
};
