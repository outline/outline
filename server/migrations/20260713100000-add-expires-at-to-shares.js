module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("shares", "expiresAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("shares", "expiresAt");
  },
};
