module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [teams, metaData] = await queryInterface.sequelize.query(
      `SELECT * FROM teams`
    );

    const teamIds = teams.map((team) => team.id);
    await Promise.all(
      teamIds.map(async (teamId) => {
        await queryInterface.sequelize.query(`
        update users
        set "isAdmin" = true
        where id in (
          select id
          from users
          where "teamId" = '${teamId}'
          order by "createdAt" asc
          limit 1
        );
      `);
      })
    );
  },
  down: async (queryInterface, Sequelize) => {
    // no-op
  },
};
