import { flushdb, seed } from '../test/support';

beforeEach(flushdb);

it('should set JWT secret and password digest', async () => {
  const { user } = await seed();
  await user.save();

  expect(user.passwordDigest).toBeTruthy();
  expect(user.getJwtToken()).toBeTruthy();

  expect(await user.verifyPassword('test123!')).toBe(true);
  expect(await user.verifyPassword('badPasswd')).toBe(false);
});
