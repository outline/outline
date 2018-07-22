// @flow
import { Team } from '../models';

function present(ctx: Object, team: Team) {
  ctx.cache.set(team.id, team);

  return {
    id: team.id,
    name: team.name,
    avatarUrl:
      team.avatarUrl || (team.slackData ? team.slackData.image_88 : null),
    slackConnected: !!team.slackId,
    googleConnected: !!team.googleId,
    userCount: team.userCount,
    isSuspended: process.env.BILLING_ENABLED ? team.isSuspended : undefined,
    isAtFreeLimit: process.env.BILLING_ENABLED ? team.isAtFreeLimit : undefined,
  };
}

export default present;
