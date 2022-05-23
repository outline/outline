import TestServer from "fetch-test-server";
import webService from "@server/services/web";
import { flushdb } from "@server/test/support";

const app = webService();
const server = new TestServer(app.callback());

beforeEach(() => flushdb());
afterAll(() => server.close());

describe("#cron.daily", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/cron.daily");
    expect(res.status).toEqual(401);
  });
});
