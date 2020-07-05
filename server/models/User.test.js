/* eslint-disable flowtype/require-valid-file-annotation */
import { flushdb } from "../test/support";
import { buildUser } from "../test/factories";

beforeEach(flushdb);

it("should set JWT secret", async () => {
  const user = await buildUser();
  expect(user.getJwtToken()).toBeTruthy();
});
