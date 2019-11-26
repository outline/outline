// @flow
import crypto from 'crypto';
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
      const hash = crypto.createHash('sha256');
      hash.update(invite.email);
      const hashedEmail = hash.digest('hex');

      await User.create({
        teamId: user.teamId,
        name: invite.name,
        email: invite.email,
        avatarUrl: `https://tiley.herokuapp.com/avatar/${hashedEmail}/${
          invite.name[0]
        }.png`,
        service: null,
      });
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
