module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint("users", "users_email_key", {});
    await queryInterface.removeConstraint("users", "users_username_key", {});
  },
  down: async (queryInterface, Sequelize) => {
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
};
