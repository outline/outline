// @flow
import invariant from "invariant";
import Sequelize from "sequelize";
import {
  AuthenticationError,
  EmailAuthenticationRequiredError,
} from "../errors";
import { User } from "../models";
import teamCreator from "./teamCreator";
import userCreator from "./userCreator";

export default async function accountProvisioner({
  ip,
  user: userParams,
  team: teamParams,
  authenticationProvider,
  authentication,
}: {|
  ip: string,
  user: {|
    name: string,
    email: string,
    isAdmin?: boolean,
    avatarUrl?: string,
    teamId: string,
  |},
  team: {|
    name: string,
    domain?: string,
    subdomain: string,
    avatarUrl?: string,
  |},
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
|}) {
  let team;
  let isFirstUser = false;
  try {
    [team, isFirstUser] = await teamCreator({
      name: teamParams.name,
      domain: teamParams.domain,
      subdomain: teamParams.subdomain,
      avatarUrl: teamParams.avatarUrl,
      authenticationProvider,
    });
  } catch (err) {
    throw new AuthenticationError(err.message);
  }
  invariant(team, "Team must exist");

  const authP = team.authenticationProviders[0];
  invariant(authP, "Team authenticationProvider must exist");

  try {
    const [user, isFirstSignin] = await userCreator({
      name: userParams.name,
      email: userParams.email,
      isAdmin: userParams.isAdmin,
      avatarUrl: userParams.avatarUrl,
      teamId: team.id,
      ip,
      authentication: {
        ...authentication,
        authenticationProviderId: authP.id,
      },
    });

    if (isFirstUser) {
      await team.provisionFirstCollection(user.id);
    }

    return {
      user,
      team,
      isFirstUser,
      isFirstSignin,
    };
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
}
