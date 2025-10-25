import uniqBy from "lodash/uniqBy";
import partition from "lodash/partition";
import { UserRole } from "@shared/types";
import InviteEmail from "@server/emails/templates/InviteEmail";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { User, Team } from "@server/models";
import { UserFlag } from "@server/models/User";
import { APIContext } from "@server/types";
import { DomainNotAllowedError } from "@server/errors";
import { can } from "@server/policies";

export type Invite = {
  name: string;
  email: string;
  role: UserRole;
};

type Props = {
  invites: Invite[];
};

export default async function userInviter(
  ctx: APIContext,
  { invites }: Props
): Promise<{
  sent: Invite[];
  unsent: Invite[];
  users: User[];
}> {
  const { user } = ctx.state.auth;
  const team = await Team.findByPk(user.teamId, { rejectOnEmpty: true });

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
      email: emails,
    },
  });
  const existingEmails = existingUsers.map(
    (existingUser) => existingUser.email
  );
  const [existingInvites, filteredInvites] = partition(
    normalizedInvites,
    (invite) => existingEmails.includes(invite.email)
  );
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
          user.isAdmin && invite.role === UserRole.Admin
            ? UserRole.Admin
            : user.isViewer || invite.role === UserRole.Viewer
              ? UserRole.Viewer
              : UserRole.Member,
        invitedById: user.id,
        flags: {
          [UserFlag.InviteSent]: 1,
        },
      },
      {
        name: "invite",
      }
    );
    users.push(newUser);

    await new InviteEmail({
      to: invite.email,
      name: invite.name,
      actorName: user.name,
      actorEmail: user.email,
      teamName: team.name,
      teamUrl: team.url,
    }).schedule();

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
