// @flow
import { User, UserAuthentication } from "../models";
import { sequelize } from "../sequelize";

export default async function userCreator({
  name,
  email,
  isAdmin,
  avatarUrl,
  teamId,
  authentication,
}: {|
  name: string,
  email: string,
  isAdmin?: boolean,
  avatarUrl?: string,
  teamId: string,
  authentication: {|
    authenticationProviderId: string,
    serviceId: string,
    scopes: string[],
    accessToken?: string,
    refreshToken?: string,
  |},
|}): Promise<[User, boolean]> {
  const { authenticationProviderId, serviceId, ...rest } = authentication;
  const auth = await UserAuthentication.findOne({
    where: {
      authenticationProviderId,
      serviceId,
    },
    include: [
      {
        model: User,
        as: "user",
      },
    ],
  });

  // Someone has signed in with this authentication before, we just
  // want to update the details instead of creating a new record
  if (auth) {
    const { user } = auth;

    await user.update({ email });
    await auth.update(rest);

    return [user, false];
  }

  // A `user` record might exist in the form of an invite even if there is no
  // existing authentication record that matches. In Outline an invite is a
  // shell user record.
  const invite = await User.findOne({
    where: {
      email,
      teamId,
    },
    include: [
      {
        model: UserAuthentication,
        as: "authentications",
        required: false,
      },
    ],
  });

  // We have an existing invite for his user, so we need to update it with our
  // new details and link up the authentication method
  if (invite && !invite.authentications.length) {
    let transaction = await sequelize.transaction();

    try {
      await invite.update(
        {
          name,
          avatarUrl,
        },
        { transaction }
      );
      await invite.createAuthentication(authentication, { transaction });
      await transaction.commit();
    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }
      throw err;
    }

    return [invite, false];
  }

  // No auth, no user – this is an entirely new sign in.
  const user = await User.create(
    {
      name,
      email,
      isAdmin,
      teamId,
      avatarUrl,
      authentications: [authentication],
    },
    {
      include: "authentications",
    }
  );

  return [user, true];
}
