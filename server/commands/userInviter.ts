import uniqBy from "lodash/uniqBy";
import { UserRole } from "@shared/types";
import InviteEmail from "@server/emails/templates/InviteEmail";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { User, Event, Team } from "@server/models";
import { UserFlag } from "@server/models/User";

export type Invite = {
  name: string;
  email: string;
  role: UserRole;
};

export default async function userInviter({
  user,
  invites,
  ip,
}: {
  user: User;
  invites: Invite[];
  ip: string;
}): Promise<{
  sent: Invite[];
  users: User[];
}> {
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
  const existingUsers = await User.findAll({
    where: {
      teamId: user.teamId,
      email: emails,
    },
  });
  const existingEmails = existingUsers.map((user) => user.email);
  const filteredInvites = normalizedInvites.filter(
    (invite) => !existingEmails.includes(invite.email)
  );
  const users = [];

  // send and record remaining invites
  for (const invite of filteredInvites) {
    const newUser = await User.create({
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
    });
    users.push(newUser);
    await Event.create({
      name: "users.invite",
      actorId: user.id,
      teamId: user.teamId,
      userId: newUser.id,
      data: {
        email: invite.email,
        name: invite.name,
        role: invite.role,
      },
      ip,
    });

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
        }/auth/email.callback?token=${newUser.getEmailSigninToken()}`
      );
    }
  }

  return {
    sent: filteredInvites,
    users,
  };
}
