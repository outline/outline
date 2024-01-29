module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn(
      "authentications",
      "serviceId",
      "service"
    );
    await queryInterface.renameColumn("integrations", "serviceId", "service");
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn(
      "authentications",
      "service",
      "serviceId"
    );
    await queryInterface.renameColumn("integrations", "service", "serviceId");
  },
};
