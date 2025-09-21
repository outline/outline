import has from "lodash/has";
import { TeamPreference } from "@shared/types";
import env from "@server/env";
import { Team, TeamDomain, User } from "@server/models";
import { APIContext } from "@server/types";

type Props = {
  params: Partial<Omit<Team, "allowedDomains">> & { allowedDomains?: string[] };
  user: User;
  team: Team;
};

const teamUpdater = async (ctx: APIContext, { params, user, team }: Props) => {
  const { allowedDomains, preferences, subdomain, ...attributes } = params;
  team.setAttributes(attributes);

  if (subdomain !== undefined && env.isCloudHosted) {
    team.subdomain = subdomain === "" ? null : subdomain;
  }

  if (allowedDomains !== undefined) {
    const existingAllowedDomains = await TeamDomain.findAll({
      where: { teamId: team.id },
      transaction: ctx.state.transaction,
    });

    // Only keep existing domains if they are still in the list of allowed domains
    const newAllowedDomains = team.allowedDomains.filter((existingTeamDomain) =>
      allowedDomains.includes(existingTeamDomain.name)
    );

    // Add new domains
    const existingDomains = team.allowedDomains.map((x) => x.name);
    const newDomains = allowedDomains.filter(
      (newDomain) => newDomain !== "" && !existingDomains.includes(newDomain)
    );
    await Promise.all(
      newDomains.map(async (newDomain) => {
        newAllowedDomains.push(
          await TeamDomain.createWithCtx(ctx, {
            name: newDomain,
            teamId: team.id,
            createdById: user.id,
          })
        );
      })
    );

    // Destroy the existing TeamDomains that were removed
    const deletedDomains = existingAllowedDomains.filter(
      (x) => !allowedDomains.includes(x.name)
    );
    await Promise.all(deletedDomains.map((x) => x.destroyWithCtx(ctx)));
    team.allowedDomains = newAllowedDomains;
  }

  if (preferences) {
    for (const value of Object.values(TeamPreference)) {
      if (has(preferences, value)) {
        team.setPreference(value, preferences[value]);
      }
    }
  }

  return team.saveWithCtx(ctx);
};

export default teamUpdater;
