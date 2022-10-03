import { buildUser, buildCollection } from "@server/test/factories";
import { getTestDatabase, getTestServer } from "@server/test/support";

const db = getTestDatabase();
const server = getTestServer();

afterAll(server.disconnect);

beforeEach(db.flush);

describe("auth/redirect", () => {
  it("should redirect to home", async () => {
    const user = await buildUser();
    const res = await server.get(
      `/auth/redirect?token=${user.getTransferToken()}`,
      {
        redirect: "manual",
      }
    );
    expect(res.status).toEqual(302);
    expect(res.headers.get("location").endsWith("/home")).toBeTruthy();
  });

  it("should redirect to first collection", async () => {
    const collection = await buildCollection();
    const user = await buildUser({
      teamId: collection.teamId,
    });
    const res = await server.get(
      `/auth/redirect?token=${user.getTransferToken()}`,
      {
        redirect: "manual",
      }
    );
    expect(res.status).toEqual(302);
    expect(res.headers.get("location").endsWith(collection.url)).toBeTruthy();
  });
});
