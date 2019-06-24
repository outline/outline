module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('users', 'email', {
      type: Sequelize.STRING,
      unique: false,
      allowNull: false,
    });
    await queryInterface.changeColumn('users', 'username', {
      type: Sequelize.STRING,
      unique: false,
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('users', 'email', {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
    });
    await queryInterface.changeColumn('users', 'username', {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
    });
  },
};
