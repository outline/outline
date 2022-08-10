import { flushdb, getTestServer } from "@server/test/support";

const server = getTestServer();

beforeEach(() => flushdb());

describe("#cron.daily", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/cron.daily");
    expect(res.status).toEqual(401);
  });
});
