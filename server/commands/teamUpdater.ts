import { has, isEqual } from "es-toolkit/compat";
import { TeamPreference } from "@shared/types";
import env from "@server/env";
import { ValidationError } from "@server/errors";
import type { User } from "@server/models";
import { Team, TeamDomain } from "@server/models";
import type { APIContext } from "@server/types";

type Props = {
  params: Partial<Omit<Team, "allowedDomains">> & { allowedDomains?: string[] };
  user: User;
  team: Team;
};

const teamUpdater = async (ctx: APIContext, { params, user, team }: Props) => {
  const { allowedDomains, preferences, subdomain, ...attributes } = params;
  team.setAttributes(attributes);

  if (subdomain !== undefined && env.isCloudHosted) {
    const newSubdomain = subdomain === "" ? null : subdomain;

    if (newSubdomain && newSubdomain !== team.subdomain) {
      const existing = await Team.findOne({
        where: { subdomain: newSubdomain },
        paranoid: false,
        transaction: ctx.state.transaction,
      });

      if (existing) {
        throw ValidationError("Subdomain is already in use");
      }
    }

    team.subdomain = newSubdomain;
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
    // Created one at a time so that the limit check on each create counts the
    // domains added earlier in the same request.
    for (const newDomain of newDomains) {
      newAllowedDomains.push(
        await TeamDomain.createWithCtx(ctx, {
          name: newDomain,
          teamId: team.id,
          createdById: user.id,
        })
      );
    }

    // Destroy the existing TeamDomains that were removed
    const deletedDomains = existingAllowedDomains.filter(
      (x) => !allowedDomains.includes(x.name)
    );
    await Promise.all(deletedDomains.map((x) => x.destroyWithCtx(ctx)));
    team.allowedDomains = newAllowedDomains;
  }

  if (preferences) {
    for (const key of Object.values(TeamPreference)) {
      if (
        has(preferences, key) &&
        !isEqual(preferences[key], team.getPreference(key))
      ) {
        team.setPreference(key, preferences[key]);
      }
    }
  }

  return team.saveWithCtx(ctx);
};

export default teamUpdater;
