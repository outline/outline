/* eslint-disable flowtype/require-valid-file-annotation */
import { flushdb } from '../test/support';
import { buildUser } from '../test/factories';

beforeEach(flushdb);

it('should set JWT secret and password digest', async () => {
  const user = await buildUser({ password: 'test123!' });
  expect(user.passwordDigest).toBeTruthy();
  expect(user.getJwtToken()).toBeTruthy();

  expect(await user.verifyPassword('test123!')).toBe(true);
  expect(await user.verifyPassword('badPasswd')).toBe(false);
});
