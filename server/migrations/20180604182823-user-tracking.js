module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("users", "lastActiveAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("users", "lastActiveIp", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("users", "lastSignedInAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("users", "lastSignedInIp", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("users", "lastActiveAt");
    await queryInterface.removeColumn("users", "lastActiveIp");
    await queryInterface.removeColumn("users", "lastSignedInAt");
    await queryInterface.removeColumn("users", "lastSignedInIp");
  },
};
