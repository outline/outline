import invariant from "invariant";
import { uniqBy } from "lodash";
import { Role } from "@shared/types";
import Logger from "@server/logging/logger";
import { User, Event, Team } from "@server/models";
import EmailTask from "@server/queues/tasks/EmailTask";

type Invite = {
  name: string;
  email: string;
  role: Role;
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
  const team = await Team.findByPk(user.teamId);
  invariant(team, "team not found");

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
      service: null,
      isAdmin: invite.role === "admin",
      isViewer: invite.role === "viewer",
    });
    users.push(newUser);
    await Event.create({
      name: "users.invite",
      actorId: user.id,
      teamId: user.teamId,
      data: {
        email: invite.email,
        name: invite.name,
        role: invite.role,
      },
      ip,
    });

    await EmailTask.schedule({
      type: "invite",
      options: {
        to: invite.email,
        name: invite.name,
        actorName: user.name,
        actorEmail: user.email,
        teamName: team.name,
        teamUrl: team.url,
      },
    });

    if (process.env.NODE_ENV === "development") {
      Logger.info(
        "email",
        `Sign in immediately: ${
          process.env.URL
        }/auth/email.callback?token=${newUser.getEmailSigninToken()}`
      );
    }
  }

  return {
    sent: filteredInvites,
    users,
  };
}
