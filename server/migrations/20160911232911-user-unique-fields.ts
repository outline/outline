module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("users", "email", {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
    });
    await queryInterface.changeColumn("users", "username", {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
    });
  },
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("users", "email", {
      type: Sequelize.STRING,
      unique: false,
      allowNull: true,
    });
    await queryInterface.changeColumn("users", "username", {
      type: Sequelize.STRING,
      unique: false,
      allowNull: true,
    });
  },
};
