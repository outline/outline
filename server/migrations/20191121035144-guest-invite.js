module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("teams", "guestSignin", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn("users", "lastSigninEmailSentAt", {
      type: Sequelize.DATE,
    });
    await queryInterface.changeColumn("users", "email", {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("teams", "guestSignin");
    await queryInterface.removeColumn("users", "lastSigninEmailSentAt");
    await queryInterface.changeColumn("users", "email", {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },
};
