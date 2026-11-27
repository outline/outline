import { partition, uniqBy } from "es-toolkit/compat";
import { Op, Sequelize } from "sequelize";
import { UserRole } from "@shared/types";
import InviteEmail from "@server/emails/templates/InviteEmail";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { User, Team } from "@server/models";
import { UserFlag } from "@server/models/User";
import type { Context } from "@server/types";
import { DomainNotAllowedError, ValidationError } from "@server/errors";
import { authorize, can } from "@server/policies";

export type Invite = {
  name: string;
  email: string;
  role: UserRole;
};

type Props = {
  invites: Invite[];
  suppressEmail?: boolean;
};

export default async function userInviter(
  ctx: Context,
  { invites, suppressEmail }: Props
): Promise<{
  sent: Invite[];
  unsent: Invite[];
  users: User[];
}> {
  const { user } = ctx.auth;
  const team = await Team.findByPk(user.teamId, { rejectOnEmpty: true });

  if (invites.some((invite) => invite.role === UserRole.Guest)) {
    authorize(user, "addGuest", team);
  }

  // filter out empties and obvious non-emails
  const compactedInvites = invites.filter(
    (invite) => !!invite.email.trim() && invite.email.match("@")
  );
  // normalize to lowercase and remove duplicates
  const normalizedInvites = uniqBy(
    compactedInvites.map((invite) => ({
      ...invite,
      email: invite.email.toLowerCase(),
    })),
    "email"
  );
  // filter out any existing users in the system
  const emails = normalizedInvites.map((invite) => invite.email);

  if (!can(user, "update", team)) {
    for (const email of emails) {
      if (!(await team.isDomainAllowed(email))) {
        throw DomainNotAllowedError();
      }
    }
  }

  const existingUsers = await User.findAll({
    where: {
      teamId: user.teamId,
      [Op.and]: [
        Sequelize.where(Sequelize.fn("lower", Sequelize.col("email")), {
          [Op.in]: emails,
        }),
      ],
    },
  });
  const existingEmails = existingUsers.map((existingUser) =>
    existingUser.email?.toLowerCase()
  );
  const [existingInvites, filteredInvites] = partition(
    normalizedInvites,
    (invite) => existingEmails.includes(invite.email)
  );

  for (const invite of filteredInvites) {
    if (
      invite.role === UserRole.Guest &&
      (await team.isTeamDomain(invite.email))
    ) {
      throw ValidationError(
        "Users with an email on a workspace domain cannot be added as guests"
      );
    }
  }

  const users = [];

  // send and record remaining invites
  for (const invite of filteredInvites) {
    const newUser = await User.createWithCtx(
      ctx,
      {
        teamId: user.teamId,
        name: invite.name,
        email: invite.email,
        role:
          invite.role === UserRole.Guest
            ? UserRole.Guest
            : user.isAdmin && invite.role === UserRole.Admin
              ? UserRole.Admin
              : user.isViewer || invite.role === UserRole.Viewer
                ? UserRole.Viewer
                : UserRole.Member,
        invitedById: user.id,
        flags: suppressEmail
          ? undefined
          : {
              [UserFlag.InviteSent]: 1,
            },
      },
      {
        name: "invite",
      }
    );
    users.push(newUser);

    if (!suppressEmail) {
      await new InviteEmail({
        to: invite.email,
        language: newUser.language,
        name: invite.name,
        actorName: user.name,
        actorEmail: user.email,
        teamName: team.name,
        teamUrl: team.url,
      }).schedule();
    }

    if (env.isDevelopment) {
      Logger.info(
        "email",
        `Sign in immediately: ${
          env.URL
        }/auth/email.callback?token=${newUser.getEmailSigninToken(ctx)}`
      );
    }
  }

  return {
    sent: filteredInvites,
    unsent: existingInvites,
    users,
  };
}
