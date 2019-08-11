/* eslint-disable flowtype/require-valid-file-annotation */
import { flushdb } from '../test/support';
import { buildUser } from '../test/factories';
import { serialize } from './index';

beforeEach(flushdb);

it.only('should serialize policy', async () => {
  const user = await buildUser();
  const response = serialize(user, user);
  expect(response.update).toEqual(true);
  expect(response.delete).toEqual(true);
});
