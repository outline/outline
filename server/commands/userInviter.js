// @flow
import { uniqBy } from 'lodash';
import { User, Event, Team } from '../models';
import mailer from '../mailer';

type Invite = { name: string, email: string };

export default async function userInviter({
  user,
  invites,
  ip,
}: {
  user: User,
  invites: Invite[],
  ip: string,
}): Promise<{ sent: Invite[] }> {
  const team = await Team.findByPk(user.teamId);

  // filter out empties, duplicates and non-emails
  const compactedInvites = uniqBy(
    invites.filter(invite => !!invite.email.trim() && invite.email.match('@')),
    'email'
  );
  const emails = compactedInvites.map(invite => invite.email);

  // filter out existing users
  const existingUsers = await User.findAll({
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
  await Promise.all(
    filteredInvites.map(async invite => {
      await Event.create({
        name: 'users.invite',
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
    })
  );

  return { sent: filteredInvites };
}
