import { Transaction } from "sequelize";
import { sequelize } from "@server/database/sequelize";
import { Event, Team, User } from "@server/models";

type TeamUpdaterProps = {
  params: Partial<Team>;
  ip?: string;
  user: User;
  team: Team;
};

const teamUpdater = async ({ params, user, team, ip }: TeamUpdaterProps) => {
  const {
    name,
    avatarUrl,
    subdomain,
    sharing,
    guestSignin,
    documentEmbeds,
    memberCollectionCreate,
    collaborativeEditing,
    defaultCollectionId,
    defaultUserRole,
    inviteRequired,
  } = params;

  if (subdomain !== undefined && process.env.SUBDOMAINS_ENABLED === "true") {
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
  if (collaborativeEditing !== undefined) {
    team.collaborativeEditing = collaborativeEditing;
  }
  if (defaultUserRole !== undefined) {
    team.defaultUserRole = defaultUserRole;
  }
  if (inviteRequired !== undefined) {
    team.inviteRequired = inviteRequired;
  }

  const changes = team.changed();

  const transaction: Transaction = await sequelize.transaction();

  try {
    const savedTeam = await team.save({
      transaction,
    });
    if (changes) {
      const data = changes.reduce((acc, curr) => {
        return { ...acc, [curr]: team[curr] };
      }, {});

      await Event.create(
        {
          name: "teams.update",
          actorId: user.id,
          teamId: user.teamId,
          data,
          ip: ip,
        },
        {
          transaction,
        }
      );
    }
    await transaction.commit();
    return savedTeam;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export default teamUpdater;
