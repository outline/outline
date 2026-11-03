module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "groups",
        "icon",
        { type: Sequelize.STRING, allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        "groups",
        "color",
        { type: Sequelize.STRING, allowNull: true },
        { transaction }
      );
    });
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn("groups", "color", { transaction });
      await queryInterface.removeColumn("groups", "icon", { transaction });
    });
  },
};
