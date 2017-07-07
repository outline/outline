// @flow
import { Team } from '../models';

function present(ctx: Object, team: Team) {
  ctx.cache.set(team.id, team);

  return {
    id: team.id,
    name: team.name,
  };
}

export default present;
