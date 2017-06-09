import { User } from '.';

import { flushdb, sequelize } from '../test/support';

beforeEach(flushdb);

it('should set JWT secret and password digest', async () => {
  const user = User.build({
    username: 'user',
    name: 'User',
    email: 'user1@example.com',
    password: 'test123!',
  });
  await user.save();

  expect(user.passwordDigest).toBeTruthy();
  expect(user.getJwtToken()).toBeTruthy();

  expect(await user.verifyPassword('test123!')).toBe(true);
  expect(await user.verifyPassword('badPasswd')).toBe(false);
});
