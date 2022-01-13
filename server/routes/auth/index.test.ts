import TestServer from "fetch-test-server";
import webService from "@server/services/web";
import { buildUser, buildCollection } from "@server/test/factories";
import { flushdb } from "@server/test/support";

const app = webService();
const server = new TestServer(app.callback());

beforeEach(() => flushdb());
afterAll(() => server.close());

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
