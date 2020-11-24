/* eslint-disable flowtype/require-valid-file-annotation */
import { buildUser } from "../test/factories";
import { flushdb } from "../test/support";

beforeEach(() => flushdb());

it("should set JWT secret", async () => {
  const user = await buildUser();
  expect(user.getJwtToken()).toBeTruthy();
});
