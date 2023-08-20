import has from "lodash/has";
import { Transaction } from "sequelize";
import { TeamPreference } from "@shared/types";
import env from "@server/env";
import { Event, Team, TeamDomain, User } from "@server/models";

type TeamUpdaterProps = {
  params: Partial<Omit<Team, "allowedDomains">> & { allowedDomains?: string[] };
  ip?: string;
  user: User;
  team: Team;
  transaction: Transaction;
};

const teamUpdater = async ({
  params,
  user,
  team,
  ip,
  transaction,
}: TeamUpdaterProps) => {
  const {
    name,
    avatarUrl,
    subdomain,
    sharing,
    guestSignin,
    documentEmbeds,
    memberCollectionCreate,
    defaultCollectionId,
    defaultUserRole,
    inviteRequired,
    allowedDomains,
    preferences,
  } = params;

  if (subdomain !== undefined && env.SUBDOMAINS_ENABLED) {
    team.subdomain = subdomain === "" ? null : subdomain;
  }

  if (name) {
    team.name = name;
  }
  if (sharing !== undefined) {
    team.sharing = sharing;
  }
  if (documentEmbeds !== undefined) {
    team.documentEmbeds = documentEmbeds;
  }
  if (guestSignin !== undefined) {
    team.guestSignin = guestSignin;
  }
  if (avatarUrl !== undefined) {
    team.avatarUrl = avatarUrl;
  }
  if (memberCollectionCreate !== undefined) {
    team.memberCollectionCreate = memberCollectionCreate;
  }
  if (defaultCollectionId !== undefined) {
    team.defaultCollectionId = defaultCollectionId;
  }
  if (defaultUserRole !== undefined) {
    team.defaultUserRole = defaultUserRole;
  }
  if (inviteRequired !== undefined) {
    team.inviteRequired = inviteRequired;
  }
  if (allowedDomains !== undefined) {
    const existingAllowedDomains = await TeamDomain.findAll({
      where: { teamId: team.id },
      transaction,
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
          await TeamDomain.create(
            {
              name: newDomain,
              teamId: team.id,
              createdById: user.id,
            },
            { transaction }
          )
        );
      })
    );

    // Destroy the existing TeamDomains that were removed
    const deletedDomains = existingAllowedDomains.filter(
      (x) => !allowedDomains.includes(x.name)
    );
    await Promise.all(deletedDomains.map((x) => x.destroy({ transaction })));

    team.allowedDomains = newAllowedDomains;
  }
  if (preferences) {
    for (const value of Object.values(TeamPreference)) {
      if (has(preferences, value)) {
        team.setPreference(value, preferences[value]);
      }
    }
  }

  const changes = team.changed();

  const savedTeam = await team.save({
    transaction,
  });

  if (changes) {
    const data = changes.reduce(
      (acc, curr) => ({ ...acc, [curr]: team[curr] }),
      {}
    );

    await Event.create(
      {
        name: "teams.update",
        actorId: user.id,
        teamId: user.teamId,
        data,
        ip,
      },
      {
        transaction,
      }
    );
  }

  return savedTeam;
};

export default teamUpdater;
