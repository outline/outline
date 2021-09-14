// @flow
import invariant from "invariant";
import Sequelize from "sequelize";
import {
  AuthenticationError,
  EmailAuthenticationRequiredError,
  AuthenticationProviderDisabledError,
} from "../errors";
import mailer from "../mailer";
import { Collection, Team, User, Group, GroupUser } from "../models";
import groupCreator from "./groupCreator";
import teamCreator from "./teamCreator";
import userCreator from "./userCreator";

const Op = Sequelize.Op;

type Props = {|
  ip: string,
  user: {|
    name: string,
    email: string,
    avatarUrl?: string,
  |},
  team: {|
    name: string,
    domain?: string,
    subdomain: string,
    avatarUrl?: string,
  |},
  groups: string[],
  authenticationProvider: {|
    name: string,
    providerId: string,
  |},
  authentication: {|
    providerId: string,
    scopes: string[],
    accessToken?: string,
    refreshToken?: string,
  |},
|};

export type AccountProvisionerResult = {|
  user: User,
  team: Team,
  groups: {|
    group: Group,
    membership: GroupUser,
    isNewGroup: boolean,
  |},
  isNewTeam: boolean,
  isNewUser: boolean,
|};

export default async function accountProvisioner({
  ip,
  user: userParams,
  team: teamParams,
  groups: groupNames = [],
  authenticationProvider: authenticationProviderParams,
  authentication: authenticationParams,
}: Props): Promise<AccountProvisionerResult> {
  let teamResult;
  try {
    teamResult = await teamCreator({
      name: teamParams.name,
      domain: teamParams.domain,
      subdomain: teamParams.subdomain,
      avatarUrl: teamParams.avatarUrl,
      authenticationProvider: authenticationProviderParams,
    });
  } catch (err) {
    throw new AuthenticationError(err.message);
  }

  invariant(teamResult, "Team creator result must exist");
  const { authenticationProvider, team, isNewTeam } = teamResult;

  if (!authenticationProvider.enabled) {
    throw new AuthenticationProviderDisabledError();
  }

  let userResult;
  try {
    userResult = await userCreator({
      name: userParams.name,
      email: userParams.email,
      isAdmin: isNewTeam,
      avatarUrl: userParams.avatarUrl,
      teamId: team.id,
      ip,
      authentication: {
        ...authenticationParams,
        authenticationProviderId: authenticationProvider.id,
      },
    });

    const { isNewUser, user } = userResult;

    if (isNewUser) {
      await mailer.sendTemplate("welcome", {
        to: user.email,
        teamUrl: team.url,
      });
    }

    if (isNewUser || isNewTeam) {
      let provision = isNewTeam;

      // accounts for the case where a team is provisioned, but the user creation
      // failed. In this case we have a valid previously created team but no
      // onboarding collection.
      if (!isNewTeam) {
        const count = await Collection.count({ where: { teamId: team.id } });
        provision = count === 0;
      }

      if (provision) {
        await team.provisionFirstCollection(user.id);
      }
    }
  } catch (err) {
    if (err instanceof Sequelize.UniqueConstraintError) {
      const exists = await User.findOne({
        where: {
          email: userParams.email,
          teamId: team.id,
        },
      });

      if (exists) {
        throw new EmailAuthenticationRequiredError(
          "Email authentication required",
          team.url
        );
      } else {
        throw new AuthenticationError(err.message, team.url);
      }
    }

    throw err;
  }

  invariant(userResult, "User creator result must exist");
  const { user } = userResult;

  let groups;
  try {
    groups = await Promise.all(
      groupNames.map(async (name) =>
        groupCreator({
          name,
          ip,
          user,
        })
      )
    );
  } catch (err) {
    // TODO
    console.error(err);
  }

  // Remove group memberships that are not part of the current user info.
  // This reconciles the user with whatever groups are passed in with the latest auth.
  // At least one group must be specfied to enable this behaviour.
  if (groupNames.length) {
    try {
      await GroupUser.destroy({
        where: {
          userId: userResult.user.id,
          groupId: {
            [Op.notIn]: groups.map((group) => group.membership.groupId),
          },
        },
      });
    } catch (err) {
      // TODO
      console.error(err);
    }
  }

  return {
    ...teamResult,
    ...userResult,
    groups,
  };
}
