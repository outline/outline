/* eslint-disable flowtype/require-valid-file-annotation */
import { buildUser } from "../test/factories";
import { flushdb } from "../test/support";
import { serialize } from "./index";

beforeEach(() => flushdb());

it("should serialize policy", async () => {
  const user = await buildUser();
  const response = serialize(user, user);
  expect(response.update).toEqual(true);
  expect(response.delete).toEqual(true);
});
