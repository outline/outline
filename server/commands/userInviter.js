// @flow
import { uniqBy } from 'lodash';
import { User, Event, Team } from '../models';
import mailer from '../mailer';
import { sequelize } from '../sequelize';

type Invite = { name: string, email: string, guest: boolean };

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

  // filter out empties, duplicates and obvious non-emails
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
      const transaction = await sequelize.transaction();
      try {
        await User.create(
          {
            teamId: user.teamId,
            name: invite.name,
            email: invite.email,
            service: null,
          },
          { transaction }
        );
        await Event.create(
          {
            name: 'users.invite',
            actorId: user.id,
            teamId: user.teamId,
            data: {
              email: invite.email,
              name: invite.name,
            },
            ip,
          },
          { transaction }
        );
        await mailer.invite({
          to: invite.email,
          name: invite.name,
          guest: invite.guest,
          actorName: user.name,
          actorEmail: user.email,
          teamName: team.name,
          teamUrl: team.url,
        });
        await transaction.commit();
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    })
  );

  return { sent: filteredInvites };
}
