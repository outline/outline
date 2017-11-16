module.exports = {
  up: function(queryInterface, Sequelize) {
    queryInterface.addColumn('documents', 'createdById', {
      type: 'UUID',
      allowNull: true,
      references: {
        model: 'users',
      },
    });
  },

  down: function(queryInterface, Sequelize) {
    queryInterface.removeColumn('documents', 'createdById');
  },
};
