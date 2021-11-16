module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  up: async (queryInterface, Sequelize) => {
    const [teams, metaData] = await queryInterface.sequelize.query(
      `SELECT * FROM teams`
    );
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'team' implicitly has an 'any' type.
    const teamIds = teams.map((team) => team.id);
    await Promise.all(
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'teamId' implicitly has an 'any' type.
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
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  down: async (queryInterface, Sequelize) => {
    // no-op
  },
};
