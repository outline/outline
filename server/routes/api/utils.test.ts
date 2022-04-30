import TestServer from "fetch-test-server";
import webService from "@server/services/web";
import { flushdb } from "@server/test/support";

const app = webService();
const server = new TestServer(app.callback());

beforeEach(() => flushdb());
afterAll(() => server.close());

describe("#utils.gc", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/utils.gc");
    expect(res.status).toEqual(401);
  });
});
