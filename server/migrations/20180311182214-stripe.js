module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('teams', 'userCount', {
      type: Sequelize.INTEGER,
      default: 0,
    });
    await queryInterface.addColumn('teams', 'billingEmail', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('teams', 'stripeCustomerId', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('teams', 'stripeSubscriptionId', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('teams', 'stripeSubscriptionStatus', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // Prefill billingEmail and userCount
    const [teams, metaData] = await queryInterface.sequelize.query(`SELECT * FROM teams`);
    const teamIds = teams.map(team => team.id);
    await Promise.all(teamIds.map(async teamId => {
      await queryInterface.sequelize.query(`
        update teams
        set "billingEmail" = (
          SELECT email 
          FROM users 
          WHERE users."teamId" = '${teamId}'
          LIMIT 1
        ),
        "userCount" = (
          SELECT count(id) 
          FROM users 
          WHERE users."teamId" = '${teamId}' AND users."suspendedAt" IS NULL
        )
        WHERE id = '${teamId}'
      `);
    }));
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('teams', 'userCount');
    await queryInterface.removeColumn('teams', 'billingEmail');
    await queryInterface.removeColumn('teams', 'stripeCustomerId');
    await queryInterface.removeColumn('teams', 'stripeSubscriptionId');
    await queryInterface.removeColumn('teams', 'stripeSubscriptionStatus');
  },
};
