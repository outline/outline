// @flow
import { User, Team } from '../models';
import events from '../events';
import mailer from '../mailer';

type Invite = { name: string, email: string };

export default async function documentMover({
  user,
  invites,
}: {
  user: User,
  invites: Invite[],
}): Promise<Invite[]> {
  const team = await Team.findByPk(user.teamId);

  // filter out empties
  const compactedInvites = invites.filter(invite => !invite.email.trim());
  const emails = compactedInvites.map(invite => invite.email);

  // filter out existing users
  const existingUsers = User.findAll({
    where: {
      teamId: user.teamId,
      email: emails,
    },
  });
  const existingEmails = existingUsers.map(user => user.email);
  const filteredInvites = compactedInvites.filter(
    invite => !existingEmails.includes(invite.email)
  );

  // send and record invites
  filteredInvites.forEach(async invite => {
    await mailer.invite({
      to: invite.email,
      name: invite.name,
      actorName: user.name,
      teamName: team.name,
      teamUrl: team.url,
    });

    events.add({
      name: 'users.invite',
      userId: user.id,
      teamId: user.teamId,
      email: invite.email,
    });
  });

  return filteredInvites;
}
