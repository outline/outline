module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
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
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
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
