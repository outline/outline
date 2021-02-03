// @flow
import { uniqBy } from "lodash";
import mailer from "../mailer";
import { User, Event, Team } from "../models";

type Invite = { name: string, email: string };

export default async function userInviter({
  user,
  invites,
  ip,
}: {
  user: User,
  invites: Invite[],
  ip: string,
}): Promise<{ sent: Invite[], users: User[] }> {
  const team = await Team.findByPk(user.teamId);

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

  let users = [];

  // send and record remaining invites
  for (const invite of filteredInvites) {
    const newUser = await User.create({
      teamId: user.teamId,
      name: invite.name,
      email: invite.email,
      service: null,
    });
    users.push(newUser);
    await Event.create({
      name: "users.invite",
      actorId: user.id,
      teamId: user.teamId,
      data: {
        email: invite.email,
        name: invite.name,
      },
      ip,
    });
    await mailer.invite({
      to: invite.email,
      name: invite.name,
      actorName: user.name,
      actorEmail: user.email,
      teamName: team.name,
      teamUrl: team.url,
    });
  }

  return { sent: filteredInvites, users };
}
