module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('collections', 'maintainerApprovalRequired', {
        type: Sequelize.BOOLEAN,
        });
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('collections', 'maintainerApprovalRequired');
    },
};