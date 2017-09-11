module.exports = {
  up: async function(queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'username', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async function(queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'username', {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },
};
