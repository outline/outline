module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      "collections",
      "maintainerApprovalRequired",
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      }
    );
    await queryInterface.changeColumn("collection_users", "permission", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "read_write",
    });
    await queryInterface.addIndex("collection_users", ["permission"]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn(
      "collections",
      "maintainerApprovalRequired"
    );
    await queryInterface.changeColumn("collection_users", "permission", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: null,
    });
    await queryInterface.removeIndex("collection_users", ["permission"]);
  },
};
