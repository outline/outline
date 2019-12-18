/* eslint-disable flowtype/require-valid-file-annotation */
import userInviter from '../commands/userInviter';
import { flushdb } from '../test/support';
import { buildUser } from '../test/factories';

beforeEach(flushdb);

describe('userInviter', async () => {
  const ip = '127.0.0.1';

  it('should return sent invites', async () => {
    const user = await buildUser();
    const response = await userInviter({
      invites: [{ email: 'test@example.com', name: 'Test' }],
      user,
      ip,
    });
    expect(response.sent.length).toEqual(1);
  });

  it('should filter empty invites', async () => {
    const user = await buildUser();
    const response = await userInviter({
      invites: [{ email: ' ', name: 'Test' }],
      user,
      ip,
    });
    expect(response.sent.length).toEqual(0);
  });

  it('should filter obviously bunk emails', async () => {
    const user = await buildUser();
    const response = await userInviter({
      invites: [{ email: 'notanemail', name: 'Test' }],
      user,
      ip,
    });
    expect(response.sent.length).toEqual(0);
  });

  it('should not send duplicates', async () => {
    const user = await buildUser();
    const response = await userInviter({
      invites: [
        { email: 'the@same.com', name: 'Test' },
        { email: 'the@SAME.COM', name: 'Test' },
      ],
      user,
      ip,
    });
    expect(response.sent.length).toEqual(1);
  });

  it('should not send invites to existing team members', async () => {
    const user = await buildUser();
    const response = await userInviter({
      invites: [{ email: user.email, name: user.name }],
      user,
      ip,
    });
    expect(response.sent.length).toEqual(0);
  });
});
